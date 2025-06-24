import { PrismaClient } from "@prisma/client";
import { GraphqlQueryError } from "@shopify/shopify-api";
import { GET_ORDERS_QUERY, GET_ORDER_BY_ID_QUERY } from "../graphql/orders";

const prisma = new PrismaClient();

export interface ShopifyOrder {
  id: string;
  legacyResourceId: string;
  name: string;
  email?: string;
  phone?: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  subtotalPriceSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalTaxSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalDiscountsSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  financialStatus?: string;
  fulfillmentStatus?: string;
  tags: string[];
  note?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  closedAt?: string;
  test: boolean;
  customer?: any;
  lineItems: {
    edges: any[];
  };
  shippingAddress?: any;
  billingAddress?: any;
}

export class OrderService {
  private static readonly RATE_LIMIT_DELAY = 500; // 500ms between requests
  private static readonly MAX_RETRIES = 3;
  private static readonly BATCH_SIZE = 50;

  /**
   * Fetch all orders from Shopify with pagination
   */
  static async fetchAllOrdersFromShopify(
    admin: any,
    shop: string,
    onProgress?: (current: number, total?: number) => void
  ): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;

    try {
      while (hasNextPage) {
        await this.delay(this.RATE_LIMIT_DELAY);

        const variables: any = {
          first: this.BATCH_SIZE
        };

        if (cursor) {
          variables.after = cursor;
        }

        const response = await this.retryGraphQLQuery(
          admin,
          GET_ORDERS_QUERY,
          variables
        );

        const orders = response.data?.orders;
        if (!orders) break;

        const orderNodes = orders.edges.map((edge: any) => edge.node);
        allOrders.push(...orderNodes);

        hasNextPage = orders.pageInfo.hasNextPage;
        cursor = orders.pageInfo.endCursor;
        pageCount++;

        if (onProgress) {
          onProgress(allOrders.length);
        }

        console.log(`Fetched page ${pageCount}, total orders: ${allOrders.length}`);
      }

      console.log(`Successfully fetched ${allOrders.length} orders from Shopify`);
      return allOrders;
    } catch (error) {
      console.error("Error fetching orders from Shopify:", error);
      throw error;
    }
  }

  /**
   * Fetch a single order by ID from Shopify
   */
  static async fetchOrderFromShopify(
    admin: any,
    orderId: string
  ): Promise<ShopifyOrder | null> {
    try {
      const response = await this.retryGraphQLQuery(
        admin,
        GET_ORDER_BY_ID_QUERY,
        { id: orderId }
      );

      return response.data?.order || null;
    } catch (error) {
      console.error(`Error fetching order ${orderId} from Shopify:`, error);
      throw error;
    }
  }

  /**
   * Save or update order in database
   */
  static async saveOrderToDatabase(
    orderData: ShopifyOrder,
    shop: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Save customer if exists
        let customerId: string | undefined;
        if (orderData.customer) {
          customerId = await this.saveCustomer(tx, orderData.customer, shop);
        }

        // Save addresses
        let shippingAddressId: string | undefined;
        let billingAddressId: string | undefined;

        if (orderData.shippingAddress) {
          shippingAddressId = await this.saveAddress(
            tx,
            orderData.shippingAddress,
            customerId
          );
        }

        if (orderData.billingAddress) {
          billingAddressId = await this.saveAddress(
            tx,
            orderData.billingAddress,
            customerId
          );
        }

        // Save order
        const order = await tx.order.upsert({
          where: { shopifyOrderId: orderData.legacyResourceId },
          update: {
            orderNumber: parseInt(orderData.name.replace('#', '')),
            email: orderData.email,
            phone: orderData.phone,
            name: orderData.name,
            totalPrice: parseFloat(orderData.totalPriceSet.shopMoney.amount),
            subtotalPrice: orderData.subtotalPriceSet
              ? parseFloat(orderData.subtotalPriceSet.shopMoney.amount)
              : null,
            totalTax: orderData.totalTaxSet
              ? parseFloat(orderData.totalTaxSet.shopMoney.amount)
              : null,
            totalDiscounts: orderData.totalDiscountsSet
              ? parseFloat(orderData.totalDiscountsSet.shopMoney.amount)
              : null,
            currency: orderData.totalPriceSet.shopMoney.currencyCode,
            financialStatus: orderData.financialStatus,
            fulfillmentStatus: orderData.fulfillmentStatus,
            tags: orderData.tags.join(','),
            note: orderData.note,
            processedAt: orderData.processedAt ? new Date(orderData.processedAt) : null,
            updatedAt: new Date(orderData.updatedAt),
            cancelledAt: orderData.cancelledAt ? new Date(orderData.cancelledAt) : null,
            closedAt: orderData.closedAt ? new Date(orderData.closedAt) : null,
            test: orderData.test,
            customerId,
            shippingAddressId,
            billingAddressId,
          },
          create: {
            id: `order_${orderData.legacyResourceId}`,
            shopifyOrderId: orderData.legacyResourceId,
            orderNumber: parseInt(orderData.name.replace('#', '')),
            email: orderData.email,
            phone: orderData.phone,
            name: orderData.name,
            totalPrice: parseFloat(orderData.totalPriceSet.shopMoney.amount),
            subtotalPrice: orderData.subtotalPriceSet
              ? parseFloat(orderData.subtotalPriceSet.shopMoney.amount)
              : null,
            totalTax: orderData.totalTaxSet
              ? parseFloat(orderData.totalTaxSet.shopMoney.amount)
              : null,
            totalDiscounts: orderData.totalDiscountsSet
              ? parseFloat(orderData.totalDiscountsSet.shopMoney.amount)
              : null,
            currency: orderData.totalPriceSet.shopMoney.currencyCode,
            financialStatus: orderData.financialStatus,
            fulfillmentStatus: orderData.fulfillmentStatus,
            tags: orderData.tags.join(','),
            note: orderData.note,
            processedAt: orderData.processedAt ? new Date(orderData.processedAt) : null,
            createdAt: new Date(orderData.createdAt),
            updatedAt: new Date(orderData.updatedAt),
            cancelledAt: orderData.cancelledAt ? new Date(orderData.cancelledAt) : null,
            closedAt: orderData.closedAt ? new Date(orderData.closedAt) : null,
            test: orderData.test,
            shop,
            customerId,
            shippingAddressId,
            billingAddressId,
          },
        });

        // Delete existing line items and recreate
        await tx.lineItem.deleteMany({
          where: { orderId: order.id }
        });

        // Save line items
        for (const edge of orderData.lineItems.edges) {
          const lineItem = edge.node;
          await tx.lineItem.create({
            data: {
              shopifyLineItemId: lineItem.id.split('/').pop(),
              productId: lineItem.product?.legacyResourceId,
              variantId: lineItem.variant?.legacyResourceId,
              title: lineItem.title,
              variantTitle: lineItem.variantTitle,
              sku: lineItem.sku,
              vendor: lineItem.vendor,
              quantity: lineItem.quantity,
              price: parseFloat(lineItem.originalUnitPriceSet.shopMoney.amount),
              totalDiscount: lineItem.totalDiscountSet
                ? parseFloat(lineItem.totalDiscountSet.shopMoney.amount)
                : null,
              taxable: lineItem.taxable,
              requiresShipping: lineItem.requiresShipping,
              fulfillmentService: lineItem.fulfillmentService?.serviceName,
              fulfillmentStatus: lineItem.fulfillmentStatus,
              grams: lineItem.weight?.value ? Math.round(lineItem.weight.value) : null,
              orderId: order.id,
            },
          });
        }
      });

      console.log(`Successfully saved order ${orderData.name} to database`);
    } catch (error) {
      console.error(`Error saving order ${orderData.name} to database:`, error);
      throw error;
    }
  }

  /**
   * Sync all orders from Shopify to database
   */
  static async syncAllOrders(
    admin: any,
    shop: string,
    onProgress?: (current: number, total?: number) => void
  ): Promise<{ success: number; errors: number }> {
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log("Starting order synchronization...");

      const orders = await this.fetchAllOrdersFromShopify(admin, shop, onProgress);

      console.log(`Processing ${orders.length} orders...`);

      for (let i = 0; i < orders.length; i++) {
        try {
          await this.saveOrderToDatabase(orders[i], shop);
          successCount++;

          if (onProgress) {
            onProgress(i + 1, orders.length);
          }

          // Add small delay to prevent overwhelming the database
          if (i % 10 === 0) {
            await this.delay(100);
          }
        } catch (error) {
          console.error(`Error processing order ${orders[i].name}:`, error);
          errorCount++;
        }
      }

      console.log(`Synchronization complete. Success: ${successCount}, Errors: ${errorCount}`);

      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error("Error during order synchronization:", error);
      throw error;
    }
  }

  /**
   * Get orders from database with pagination and filtering
   */
  static async getOrdersFromDatabase(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    shop: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      shop
    } = params;

    const skip = (page - 1) * limit;

    const where: any = { shop };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
      ];
    }

    if (status) {
      where.financialStatus = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          lineItems: true,
          shippingAddress: true,
          billingAddress: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Helper methods
  private static async saveCustomer(tx: any, customerData: any, shop: string) {
    const customer = await tx.customer.upsert({
      where: { shopifyCustomerId: customerData.legacyResourceId },
      update: {
        email: customerData.email,
        phone: customerData.phone,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        ordersCount: customerData.ordersCount,
        totalSpent: customerData.totalSpentV2
          ? parseFloat(customerData.totalSpentV2.amount)
          : 0,
        tags: customerData.tags ? customerData.tags.join(',') : null,
        note: customerData.note,
        verifiedEmail: customerData.verifiedEmail,
        taxExempt: customerData.taxExempt,
        updatedAt: new Date(customerData.updatedAt),
      },
      create: {
        id: `customer_${customerData.legacyResourceId}`,
        shopifyCustomerId: customerData.legacyResourceId,
        email: customerData.email,
        phone: customerData.phone,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        ordersCount: customerData.ordersCount,
        totalSpent: customerData.totalSpentV2
          ? parseFloat(customerData.totalSpentV2.amount)
          : 0,
        tags: customerData.tags ? customerData.tags.join(',') : null,
        note: customerData.note,
        verifiedEmail: customerData.verifiedEmail,
        taxExempt: customerData.taxExempt,
        createdAt: new Date(customerData.createdAt),
        updatedAt: new Date(customerData.updatedAt),
        shop,
      },
    });

    return customer.id;
  }

  private static async saveAddress(tx: any, addressData: any, customerId?: string) {
    if (!addressData) return undefined;

    const address = await tx.address.create({
      data: {
        firstName: addressData.firstName,
        lastName: addressData.lastName,
        company: addressData.company,
        address1: addressData.address1,
        address2: addressData.address2,
        city: addressData.city,
        province: addressData.province,
        country: addressData.country,
        zip: addressData.zip,
        phone: addressData.phone,
        name: addressData.name,
        provinceCode: addressData.provinceCode,
        countryCode: addressData.countryCode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        customerId,
      },
    });

    return address.id;
  }

  private static async retryGraphQLQuery(
    admin: any,
    query: string,
    variables: any,
    retries = 0
  ): Promise<any> {
    try {
      return await admin.graphql(query, { variables });
    } catch (error) {
      if (retries < this.MAX_RETRIES && this.isRetryableError(error)) {
        console.log(`Retrying GraphQL query (attempt ${retries + 1}/${this.MAX_RETRIES})`);
        await this.delay(1000 * Math.pow(2, retries)); // Exponential backoff
        return this.retryGraphQLQuery(admin, query, variables, retries + 1);
      }
      throw error;
    }
  }

  private static isRetryableError(error: any): boolean {
    if (error instanceof GraphqlQueryError) {
      const extensions = error.response?.errors?.[0]?.extensions;
      return extensions?.code === 'THROTTLED' || extensions?.code === 'INTERNAL_ERROR';
    }
    return false;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}