export const GET_ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          legacyResourceId
          name
          email
          phone
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          financialStatus
          fulfillmentStatus
          tags
          note
          processedAt
          createdAt
          updatedAt
          cancelledAt
          closedAt
          test
          customer {
            id
            legacyResourceId
            email
            phone
            firstName
            lastName
            ordersCount
            totalSpentV2 {
              amount
              currencyCode
            }
            tags
            note
            verifiedEmail
            taxExempt
            createdAt
            updatedAt
            addresses {
              id
              firstName
              lastName
              company
              address1
              address2
              city
              province
              country
              zip
              phone
              name
              provinceCode
              countryCode
              latitude
              longitude
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                product {
                  id
                  legacyResourceId
                }
                variant {
                  id
                  legacyResourceId
                }
                title
                variantTitle
                sku
                vendor
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalDiscountSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                taxable
                requiresShipping
                fulfillmentService {
                  serviceName
                }
                fulfillmentStatus
                weight {
                  value
                  unit
                }
              }
            }
          }
          shippingAddress {
            firstName
            lastName
            company
            address1
            address2
            city
            province
            country
            zip
            phone
            name
            provinceCode
            countryCode
            latitude
            longitude
          }
          billingAddress {
            firstName
            lastName
            company
            address1
            address2
            city
            province
            country
            zip
            phone
            name
            provinceCode
            countryCode
            latitude
            longitude
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_ORDER_BY_ID_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      legacyResourceId
      name
      email
      phone
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalDiscountsSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      financialStatus
      fulfillmentStatus
      tags
      note
      processedAt
      createdAt
      updatedAt
      cancelledAt
      closedAt
      test
      customer {
        id
        legacyResourceId
        email
        phone
        firstName
        lastName
        ordersCount
        totalSpentV2 {
          amount
          currencyCode
        }
        tags
        note
        verifiedEmail
        taxExempt
        createdAt
        updatedAt
        addresses {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
          name
          provinceCode
          countryCode
          latitude
          longitude
        }
      }
      lineItems(first: 250) {
        edges {
          node {
            id
            product {
              id
              legacyResourceId
            }
            variant {
              id
              legacyResourceId
            }
            title
            variantTitle
            sku
            vendor
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalDiscountSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            taxable
            requiresShipping
            fulfillmentService {
              serviceName
            }
            fulfillmentStatus
            weight {
              value
              unit
            }
          }
        }
      }
      shippingAddress {
        firstName
        lastName
        company
        address1
        address2
        city
        province
        country
        zip
        phone
        name
        provinceCode
        countryCode
        latitude
        longitude
      }
      billingAddress {
        firstName
        lastName
        company
        address1
        address2
        city
        province
        country
        zip
        phone
        name
        provinceCode
        countryCode
        latitude
        longitude
      }
    }
  }
`;