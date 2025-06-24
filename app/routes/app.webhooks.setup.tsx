import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const webhookEndpoint = `${process.env.SHOPIFY_APP_URL}/webhooks/orders`;

    const webhooks = [
      {
        topic: "orders/create",
        address: webhookEndpoint,
        format: "json",
      },
      {
        topic: "orders/updated",
        address: webhookEndpoint,
        format: "json",
      },
      {
        topic: "orders/cancelled",
        address: webhookEndpoint,
        format: "json",
      },
      {
        topic: "orders/fulfilled",
        address: webhookEndpoint,
        format: "json",
      },
    ];

    const results = [];

    for (const webhookData of webhooks) {
      try {
        const webhook = new admin.rest.resources.Webhook({ session });
        webhook.topic = webhookData.topic;
        webhook.address = webhookData.address;
        webhook.format = webhookData.format;

        await webhook.save({
          update: true,
        });

        results.push({
          topic: webhookData.topic,
          success: true,
          id: webhook.id,
        });

        console.log(`Created webhook for ${webhookData.topic}`);
      } catch (error) {
        console.error(`Error creating webhook for ${webhookData.topic}:`, error);
        results.push({
          topic: webhookData.topic,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return json({
      success: successCount === totalCount,
      message: `Created ${successCount}/${totalCount} webhooks successfully`,
      results,
    });
  } catch (error) {
    console.error("Webhook setup error:", error);
    return json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to setup webhooks",
    });
  }
};