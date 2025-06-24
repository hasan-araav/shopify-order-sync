import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { OrderService } from "../services/orderService";
import {
  Card,
  Page,
  Layout,
  DataTable,
  Pagination,
  Filters,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = (url.searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  const ordersData = await OrderService.getOrdersFromDatabase({
    page,
    limit: 20,
    search,
    status,
    sortBy,
    sortOrder,
    shop: session.shop,
  });

  return json({
    orders: ordersData.orders,
    pagination: ordersData.pagination,
    filters: { search, status, sortBy, sortOrder },
  });
};

export default function OrdersPage() {
  const { orders, pagination, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalActive, setModalActive] = useState(false);

  // Filter state
  const [queryValue, setQueryValue] = useState(filters.search);
  const [statusFilter, setStatusFilter] = useState(filters.status);

  // Real-time updates simulation (in production, use WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh data every 30 seconds
      window.location.reload();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleFiltersQueryChange = useCallback((value: string) => {
    setQueryValue(value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string[]) => {
    setStatusFilter(value[0] || "");
  }, []);

  const handleFiltersSubmit = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);

    if (queryValue) {
      newSearchParams.set("search", queryValue);
    } else {
      newSearchParams.delete("search");
    }

    if (statusFilter) {
      newSearchParams.set("status", statusFilter);
    } else {
      newSearchParams.delete("status");
    }

    newSearchParams.set("page", "1");
    setSearchParams(newSearchParams);
  }, [queryValue, statusFilter, searchParams, setSearchParams]);

  const handleFiltersClearAll = useCallback(() => {
    setQueryValue("");
    setStatusFilter("");
    setSearchParams({});
  }, [setSearchParams]);

  const handlePagination = useCallback((direction: "previous" | "next") => {
    const newSearchParams = new URLSearchParams(searchParams);
    const currentPage = pagination.page;

    if (direction === "previous" && currentPage > 1) {
      newSearchParams.set("page", (currentPage - 1).toString());
    } else if (direction === "next" && currentPage < pagination.pages) {
      newSearchParams.set("page", (currentPage + 1).toString());
    }

    setSearchParams(newSearchParams);
  }, [pagination, searchParams, setSearchParams]);

  const handleSort = useCallback((headingIndex: number, direction: "asc" | "desc") => {
    const sortFields = ["name", "email", "totalPrice", "financialStatus", "createdAt"];
    const sortBy = sortFields[headingIndex] || "createdAt";

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("sortBy", sortBy);
    newSearchParams.set("sortOrder", direction);
    newSearchParams.set("page", "1");

    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  const openOrderModal = useCallback((order: any) => {
    setSelectedOrder(order);
    setModalActive(true);
  }, []);

  const closeOrderModal = useCallback(() => {
    setSelectedOrder(null);
    setModalActive(false);
  }, []);

  // Status options for filter
  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Authorized", value: "authorized" },
    { label: "Paid", value: "paid" },
    { label: "Partially Paid", value: "partially_paid" },
    { label: "Refunded", value: "refunded" },
    { label: "Voided", value: "voided" },
    { label: "Partially Refunded", value: "partially_refunded" },
  ];

  // Prepare table data
  const tableRows = orders.map((order) => [
    order.name,
    order.email || "—",
    `${order.currency} ${order.totalPrice}`,
    <Badge
      key={order.id}
      status={getStatusBadgeStatus(order.financialStatus)}
    >
      {order.financialStatus || "Unknown"}
    </Badge>,
    new Date(order.createdAt).toLocaleDateString(),
    <Button
      key={`view-${order.id}`}
      size="slim"
      onClick={() => openOrderModal(order)}
    >
      View Details
    </Button>,
  ]);

  const tableHeadings = [
    "Order",
    "Customer Email",
    "Total",
    "Status",
    "Date",
    "Actions",
  ];

  return (
    <Page
      title="Orders"
      subtitle={`${pagination.total} orders found`}
      primaryAction={{
        content: "Sync Orders",
        onAction: () => navigate("/app/sync"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Filters
                queryValue={queryValue}
                filters={[
                  {
                    key: "status",
                    label: "Financial Status",
                    filter: (
                      <select
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange([e.target.value])}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ),
                    shortcut: true,
                  },
                ]}
                onQueryChange={handleFiltersQueryChange}
                onQueryClear={() => setQueryValue("")}
                onClearAll={handleFiltersClearAll}
              />

              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={tableHeadings}
                rows={tableRows}
                sortable={[true, true, true, true, true, false]}
                onSort={handleSort}
                defaultSortDirection="desc"
                initialSortColumnIndex={4}
              />

              {pagination.pages > 1 && (
                <InlineStack align="center">
                  <Pagination
                    hasPrevious={pagination.page > 1}
                    onPrevious={() => handlePagination("previous")}
                    hasNext={pagination.page < pagination.pages}
                    onNext={() => handlePagination("next")}
                    label={`${pagination.page} of ${pagination.pages}`}
                  />
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Order Details Modal */}
      <Modal
        open={modalActive}
        onClose={closeOrderModal}
        title={selectedOrder?.name || "Order Details"}
        size="large"
      >
        <Modal.Section>
          {selectedOrder && (
            <OrderDetailsContent order={selectedOrder} />
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

function OrderDetailsContent({ order }: { order: any }) {
  return (
    <BlockStack gap="400">
      <InlineStack gap="400">
        <div style={{ flex: 1 }}>
          <Text variant="bodyMd" as="p" color="subdued">
            Order Number
          </Text>
          <Text variant="bodyLg" as="p">
            {order.name}
          </Text>
        </div>

        <div style={{ flex: 1 }}>
          <Text variant="bodyMd" as="p" color="subdued">
            Total Amount
          </Text>
          <Text variant="bodyLg" as="p">
            {order.currency} {order.totalPrice}
          </Text>
        </div>

        <div style={{ flex: 1 }}>
          <Text variant="bodyMd" as="p" color="subdued">
            Status
          </Text>
          <Badge status={getStatusBadgeStatus(order.financialStatus)}>
            {order.financialStatus || "Unknown"}
          </Badge>
        </div>
      </InlineStack>

      {order.customer && (
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              Customer Information
            </Text>
            <InlineStack gap="400">
              <div>
                <Text variant="bodyMd" as="p" color="subdued">
                  Name
                </Text>
                <Text variant="bodyMd" as="p">
                  {order.customer.firstName} {order.customer.lastName}
                </Text>
              </div>
              <div>
                <Text variant="bodyMd" as="p" color="subdued">
                  Email
                </Text>
                <Text variant="bodyMd" as="p">
                  {order.customer.email || "—"}
                </Text>
              </div>
              <div>
                <Text variant="bodyMd" as="p" color="subdued">
                  Phone
                </Text>
                <Text variant="bodyMd" as="p">
                  {order.customer.phone || "—"}
                </Text>
              </div>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {order.lineItems && order.lineItems.length > 0 && (
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              Line Items
            </Text>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric"]}
              headings={["Product", "Quantity", "Price", "Total"]}
              rows={order.lineItems.map((item: any) => [
                item.title + (item.variantTitle ? ` - ${item.variantTitle}` : ""),
                item.quantity,
                `${order.currency} ${item.price}`,
                `${order.currency} ${(parseFloat(item.price) * item.quantity).toFixed(2)}`,
              ])}
            />
          </BlockStack>
        </Card>
      )}

      {order.shippingAddress && (
        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              Shipping Address
            </Text>
            <TextContainer>
              <Text variant="bodyMd" as="p">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </Text>
              {order.shippingAddress.company && (
                <Text variant="bodyMd" as="p">
                  {order.shippingAddress.company}
                </Text>
              )}
              <Text variant="bodyMd" as="p">
                {order.shippingAddress.address1}
              </Text>
              {order.shippingAddress.address2 && (
                <Text variant="bodyMd" as="p">
                  {order.shippingAddress.address2}
                </Text>
              )}
              <Text variant="bodyMd" as="p">
                {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
              </Text>
              <Text variant="bodyMd" as="p">
                {order.shippingAddress.country}
              </Text>
            </TextContainer>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}

function getStatusBadgeStatus(status: string): "success" | "info" | "attention" | "warning" | "critical" | undefined {
  switch (status?.toLowerCase()) {
    case "paid":
      return "success";
    case "pending":
    case "authorized":
      return "attention";
    case "partially_paid":
    case "partially_refunded":
      return "warning";
    case "refunded":
    case "voided":
      return "info";
    default:
      return undefined;
  }
}