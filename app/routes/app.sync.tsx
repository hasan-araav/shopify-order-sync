import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { OrderService } from "../services/orderService";
import {
  Card,
  Page,
  Layout,
  Button,
  Banner,
  ProgressBar,
  Text,
  BlockStack,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get sync status from database
  const stats = await OrderService.getOrdersFromDatabase({
    page: 1,
    limit: 1,
    shop: session.shop,
  });

  return json({
    shop: session.shop,
    totalOrders: stats.pagination.total,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "sync") {
      const result = await OrderService.syncAllOrders(admin, session.shop);

      return json({
        success: true,
        message: `Sync completed! Successfully processed ${result.success} orders. ${result.errors} errors.`,
        result,
      });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error("Sync action error:", error);
    return json({
      success: false,
      message: error instanceof Error ? error.message : "An error occurred during sync",
    });
  }
};

export default function SyncPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [isManualSync, setIsManualSync] = useState(false);

  const isLoading = navigation.state === "submitting" || fetcher.state === "submitting";

  // Setup webhook endpoint
  const setupWebhooks = async () => {
    try {
      fetcher.submit(
        { action: "setup-webhooks" },
        { method: "post", action: "/app/webhooks/setup" }
      );
    } catch (error) {
      console.error("Error setting up webhooks:", error);
    }
  };

  const startSync = () => {
    setIsManualSync(true);
    setSyncProgress(0);
    setSyncTotal(0);

    fetcher.submit(
      { action: "sync" },
      { method: "post" }
    );
  };

  useEffect(() => {
    if (actionData?.success && isManualSync) {
      setIsManualSync(false);
      setSyncProgress(0);
      setSyncTotal(0);
    }
  }, [actionData, isManualSync]);

  return (
    <Page
      title="Order Synchronization"
      subtitle="Sync orders from Shopify to your database"
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.success === false && (
              <Banner
                title="Sync Error"
                status="critical"
                onDismiss={() => window.location.reload()}
              >
                <Text as="p">{actionData.message}</Text>
              </Banner>
            )}

            {actionData?.success === true && (
              <Banner
                title="Sync Completed"
                status="success"
                onDismiss={() => window.location.reload()}
              >
                <Text as="p">{actionData.message}</Text>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Current Status
                </Text>

                <InlineStack gap="400">
                  <div>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Total Orders in Database
                    </Text>
                    <Text variant="headingLg" as="p">
                      {loaderData.totalOrders.toLocaleString()}
                    </Text>
                  </div>

                  <div>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Shop
                    </Text>
                    <Badge>{loaderData.shop}</Badge>
                  </div>
                </InlineStack>

                {isLoading && syncTotal > 0 && (
                  <div>
                    <Text variant="bodyMd" as="p" color="subdued">
                      Sync Progress: {syncProgress} / {syncTotal}
                    </Text>
                    <ProgressBar
                      progress={(syncProgress / syncTotal) * 100}
                      size="small"
                    />
                  </div>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Manual Sync
                </Text>

                <Text variant="bodyMd" as="p">
                  Manually sync all orders from your Shopify store to the database.
                  This process may take several minutes depending on the number of orders.
                </Text>

                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    onClick={startSync}
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? "Syncing Orders..." : "Start Full Sync"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Webhook Setup
                </Text>

                <Text variant="bodyMd" as="p">
                  Set up webhooks to automatically sync new and updated orders in real-time.
                </Text>

                <InlineStack gap="300">
                  <Button
                    onClick={setupWebhooks}
                    loading={fetcher.state === "submitting"}
                  >
                    Setup Webhooks
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}