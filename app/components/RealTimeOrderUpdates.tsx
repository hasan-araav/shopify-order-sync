import { useEffect, useState } from "react";
import { Banner, Toast } from "@shopify/polaris";

export function RealTimeOrderUpdates() {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // In a real implementation, you would use WebSocket or Server-Sent Events
    // For this example, we'll poll for updates every 30 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/app/api/orders/new-count");
        const data = await response.json();

        if (data.newCount > newOrdersCount) {
          setNewOrdersCount(data.newCount);
          setShowToast(true);
        }
      } catch (error) {
        console.error("Error checking for new orders:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [newOrdersCount]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const toastMarkup = showToast ? (
    <Toast
      content={`${newOrdersCount} new orders received`}
      onDismiss={() => setShowToast(false)}
      action={{
        content: "Refresh",
        onAction: handleRefresh,
      }}
    />
  ) : null;

  return (
    <>
      {newOrdersCount > 0 && (
        <Banner
          title="New orders available"
          status="info"
          action={{ content: "Refresh page", onAction: handleRefresh }}
          onDismiss={() => setNewOrdersCount(0)}
        >
          <p>{newOrdersCount} new orders have been received since you last refreshed.</p>
        </Banner>
      )}
      {toastMarkup}
    </>
  );
}