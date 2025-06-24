import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { OrderService } from "../services/orderService";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Verify webhook
    const body = await request.text();
    const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
    const shop = request.headers.get("X-Shopify-Shop-Domain");
    const topic = request.headers.get("X-Shopify-Topic");

    if (!hmac || !shop || !topic) {
      console.error("Missing required webhook headers");
      return new Response("Missing required headers", { status: 400 });
    }

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const generatedHash = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("base64");

      if (generatedHash !== hmac) {
        console.error("Webhook signature verification failed");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    console.log(`Received webhook: ${topic} from ${shop}`);

    // Log webhook for debugging
    const webhookLog = await prisma.webhookLog.create({
      data: {
        topic,
        shopDomain: shop,
        payload: body,
        processed: false,
      },
    });

    try {
      const orderData = JSON.parse(body);

      // Handle different order events
      if (topic === "orders/create" || topic === "orders/updated") {
        await handleOrderWebhook(orderData, shop);
      } else if (topic === "orders/cancelled") {
        await handleOrderCancellation(orderData, shop);
      } else if (topic === "orders/fulfilled") {
        await handleOrderFulfillment(orderData, shop);
      }

      // Mark webhook as processed
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          processed: true,
          processedAt: new Date(),
          orderId: orderData.id?.toString(),
        },
      });

      console.log(`Successfully processed webhook: ${topic}`);
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);

      // Update webhook log with error
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        },
      });

      return new Response("Internal Server Error", { status: 500 });
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

async function handleOrderWebhook(orderData: any, shop: string) {
  try {
    // Get admin API instance
    const { admin } = await authenticate.admin(
      new Request(`https://${shop}`)
    );

    // Fetch full order data from Shopify using GraphQL
    const gqlOrderId = `gid://shopify/Order/${orderData.id}`;
    const fullOrderData = await OrderService.fetchOrderFromShopify(admin, gqlOrderId);

    if (fullOrderData) {
      await OrderService.saveOrderToDatabase(fullOrderData, shop);
      console.log(`Order ${orderData.name || orderData.id} synced successfully`);
    }
  } catch (error) {
    console.error("Error handling order webhook:", error);
    throw error;
  }
}

async function handleOrderCancellation(orderData: any, shop: string) {
  try {
    await prisma.order.updateMany({
      where: {
        shopifyOrderId: orderData.id.toString(),
        shop,
      },
      data: {
        financialStatus: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Order ${orderData.name || orderData.id} marked as cancelled`);
  } catch (error) {
    console.error("Error handling order cancellation:", error);
    throw error;
  }
}

async function handleOrderFulfillment(orderData: any, shop: string) {
  try {
    await prisma.order.updateMany({
      where: {
        shopifyOrderId: orderData.id.toString(),
        shop,
      },
      data: {
        fulfillmentStatus: "fulfilled",
        updatedAt: new Date(),
      },
    });
    console.log(`Order ${orderData.name || orderData.id} marked as fulfilled`);
  } catch (error) {
    console.error("Error handling order fulfillment:", error);
    throw error;
  }
}