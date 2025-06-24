# Shopify Order Sync App

## 🛠 Tech Stack

- **Frontend**: React, Remix, Shopify Polaris
- **Backend**: Node.js, Remix
- **Database**: MySQL with Prisma ORM
- **API**: Shopify GraphQL Admin API
- **Authentication**: Shopify App Bridge
- **Real-time**: Webhooks for live order updates

## 🔧 Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd shopify-order-sync-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Environment Configuration

Edit `.env` file with your credentials:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
SCOPES=read_orders,read_customers,read_products
SHOPIFY_APP_URL=https://your-ngrok-url.ngrok.io

# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/shopify_orders"

# Session Configuration
SESSION_SECRET=your_random_session_secret_here

# Optional: Webhook Security
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to verify setup
npx prisma studio
```

### Webhook Endpoints

- `/webhooks/orders` - Handles all order-related webhooks
- `/app/webhooks/setup` - Webhook configuration endpoint

### Webhook Events

Supported webhook topics:

- `orders/create` - New order created
- `orders/updated` - Order information updated
- `orders/cancelled` - Order cancelled
- `orders/fulfilled` - Order fulfilled

## 📊 Project Structure

```
├── app/
│   ├── components/          # Reusable React components
│   ├── graphql/            # GraphQL queries and mutations
│   ├── routes/             # Remix routes (pages and API)
│   ├── services/           # Business logic and services
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
```