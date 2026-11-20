/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SAMPLE_DATASET_INDEX } from './constants';
import type { AnalyticsUseCase } from './types';

const GAMING_INDEX = 'game-events-*';
const ADTECH_INDEX = 'ad-events-*';
const IOT_INDEX = 'device-events-*';
const CUSTOMER_FACING_INDEX = 'tenant-events-*';

/** The use cases the analytics pages offer, with starter ES|QL queries for each. */
export const getAnalyticsUseCases = (): readonly AnalyticsUseCase[] => [
  {
    id: 'clickstream',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.clickstream.title', {
      defaultMessage: 'Clickstream and product analytics',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.useCases.clickstream.description', {
      defaultMessage: 'Follow users through sessions, funnels and purchases.',
    }),
    iconType: 'globe',
    sampleDataset: 'clickstream',
    indexPattern: SAMPLE_DATASET_INDEX.clickstream,
    starterQueries: [
      {
        id: 'clickstream_purchase_funnel',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.clickstream.purchaseFunnel',
          { defaultMessage: 'Where do sessions drop out between the first page and a purchase?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.clickstream}
| WHERE event.action IN ("page_view", "product_view", "add_to_cart", "checkout_started", "purchase")
| STATS sessions = COUNT_DISTINCT(session.id), users = COUNT_DISTINCT(user.id) BY step = event.action
| SORT sessions DESC`,
      },
      {
        id: 'clickstream_campaign_conversion',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.clickstream.campaignConversion',
          { defaultMessage: 'Which campaigns turn sessions into orders and revenue?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.clickstream}
| WHERE campaign.name IS NOT NULL
| STATS sessions = COUNT_DISTINCT(session.id), orders = COUNT(order.id), revenue = ROUND(SUM(order.total), 2) BY campaign.name
| EVAL conversion_pct = ROUND(orders * 100.0 / sessions, 1), revenue_per_session = ROUND(revenue / sessions, 2)
| SORT conversion_pct DESC`,
      },
      {
        id: 'clickstream_daily_active_users',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.clickstream.dailyActiveUsers',
          { defaultMessage: 'How many users are active each day, and how many of them came back?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.clickstream}
| STATS active_users = COUNT_DISTINCT(user.id), new_users = COUNT_DISTINCT(user.id) WHERE user.segment == "new", returning_users = COUNT_DISTINCT(user.id) WHERE user.segment == "returning" BY day = BUCKET(@timestamp, 1 day)
| EVAL returning_pct = ROUND(returning_users * 100.0 / active_users, 1)
| SORT day`,
      },
    ],
  },
  {
    id: 'gaming',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.gaming.title', {
      defaultMessage: 'Gaming telemetry',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.useCases.gaming.description', {
      defaultMessage: 'Track players, matches and in-game purchases.',
    }),
    iconType: 'bolt',
    indexPattern: GAMING_INDEX,
    starterQueries: [
      {
        id: 'gaming_active_players',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.gaming.activePlayers', {
          defaultMessage: 'How many players are active each hour?',
        }),
        esql: `FROM ${GAMING_INDEX}
| STATS active_players = COUNT_DISTINCT(player.id) BY hour = BUCKET(@timestamp, 1 hour)
| SORT hour`,
      },
      {
        id: 'gaming_level_difficulty',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.gaming.levelDifficulty', {
          defaultMessage: 'Which levels take players the longest to finish?',
        }),
        esql: `FROM ${GAMING_INDEX}
| WHERE event.action == "level_complete"
| STATS completions = COUNT(*), p50_seconds = PERCENTILE(level.duration_seconds, 50), p95_seconds = PERCENTILE(level.duration_seconds, 95) BY level.name
| SORT p95_seconds DESC
| LIMIT 10`,
      },
      {
        id: 'gaming_revenue_by_item',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.gaming.revenueByItem', {
          defaultMessage: 'Which items bring in the most revenue per paying player?',
        }),
        esql: `FROM ${GAMING_INDEX}
| WHERE event.action == "item_purchase"
| STATS revenue = SUM(purchase.amount_usd), buyers = COUNT_DISTINCT(player.id) BY item.name
| EVAL revenue_per_buyer = ROUND(revenue / buyers, 2)
| SORT revenue DESC
| LIMIT 10`,
      },
    ],
  },
  {
    id: 'transactions',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.transactions.title', {
      defaultMessage: 'Transactions and fraud',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.useCases.transactions.description',
      {
        defaultMessage: 'Watch payments, orders and transfers, and spot outliers.',
      }
    ),
    iconType: 'money',
    sampleDataset: 'ecommerce',
    indexPattern: SAMPLE_DATASET_INDEX.ecommerce,
    starterQueries: [
      {
        id: 'transactions_revenue_over_time',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.transactions.revenueOverTime',
          { defaultMessage: 'How much revenue and how many orders come in each day?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.ecommerce}
| STATS revenue = SUM(taxful_total_price), orders = COUNT(*) BY day = BUCKET(order_date, 1 day)
| SORT day`,
      },
      {
        id: 'transactions_top_customers',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.transactions.topCustomers',
          { defaultMessage: 'Which customers spend the most, and what is their average order?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.ecommerce}
| STATS spend = SUM(taxful_total_price), orders = COUNT(*), avg_order_value = AVG(taxful_total_price) BY customer_id
| SORT spend DESC
| LIMIT 10`,
      },
      {
        id: 'transactions_outliers_by_country',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.transactions.outliersByCountry',
          { defaultMessage: 'Which countries see orders far above their typical order value?' }
        ),
        esql: `FROM ${SAMPLE_DATASET_INDEX.ecommerce}
| STATS orders = COUNT(*), buyers = COUNT_DISTINCT(customer_id), p50_order = PERCENTILE(taxful_total_price, 50), p99_order = PERCENTILE(taxful_total_price, 99) BY geoip.country_iso_code
| EVAL p99_to_median = ROUND(p99_order / p50_order, 1)
| SORT p99_to_median DESC
| LIMIT 10`,
      },
    ],
  },
  {
    id: 'adtech',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.adtech.title', {
      defaultMessage: 'Adtech',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.useCases.adtech.description', {
      defaultMessage: 'Measure impressions, clicks and conversions per campaign.',
    }),
    iconType: 'bullseye',
    indexPattern: ADTECH_INDEX,
    starterQueries: [
      {
        id: 'adtech_campaign_ctr',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.adtech.campaignCtr', {
          defaultMessage: 'Which campaigns have the best click-through rate?',
        }),
        esql: `FROM ${ADTECH_INDEX}
| EVAL is_impression = CASE(event.action == "impression", 1, 0), is_click = CASE(event.action == "click", 1, 0)
| STATS impressions = SUM(is_impression), clicks = SUM(is_click) BY campaign.id
| WHERE impressions > 0
| EVAL ctr_pct = ROUND(clicks * 100.0 / impressions, 2)
| SORT ctr_pct DESC
| LIMIT 10`,
      },
      {
        id: 'adtech_spend_over_time',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.adtech.spendOverTime', {
          defaultMessage: 'How much are we spending each hour, and how many people do we reach?',
        }),
        esql: `FROM ${ADTECH_INDEX}
| WHERE event.action == "impression"
| STATS spend = SUM(bid.price_usd), reach = COUNT_DISTINCT(user.id) BY hour = BUCKET(@timestamp, 1 hour)
| SORT hour`,
      },
      {
        id: 'adtech_bid_price_by_publisher',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.adtech.bidPriceByPublisher',
          { defaultMessage: 'Which publishers are the most expensive to win?' }
        ),
        esql: `FROM ${ADTECH_INDEX}
| WHERE event.action == "bid_won"
| STATS wins = COUNT(*), p50_price = PERCENTILE(bid.price_usd, 50), p95_price = PERCENTILE(bid.price_usd, 95) BY publisher.name
| SORT p95_price DESC
| LIMIT 10`,
      },
    ],
  },
  {
    id: 'iot',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.iot.title', {
      defaultMessage: 'IoT and devices',
    }),
    description: i18n.translate('xpack.searchHomepage.analytics.useCases.iot.description', {
      defaultMessage: 'Collect readings and state changes from fleets of devices.',
    }),
    iconType: 'thermometer',
    indexPattern: IOT_INDEX,
    starterQueries: [
      {
        id: 'iot_reporting_devices',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.iot.reportingDevices', {
          defaultMessage: 'How many devices report in every five minutes?',
        }),
        esql: `FROM ${IOT_INDEX}
| STATS devices = COUNT_DISTINCT(device.id), readings = COUNT(*) BY window = BUCKET(@timestamp, 5 minutes)
| SORT window`,
      },
      {
        id: 'iot_hottest_devices',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.iot.hottestDevices', {
          defaultMessage: 'Which devices run hottest?',
        }),
        esql: `FROM ${IOT_INDEX}
| WHERE event.action == "sensor_reading"
| STATS avg_temperature = AVG(sensor.temperature_celsius), p99_temperature = PERCENTILE(sensor.temperature_celsius, 99) BY device.id
| SORT p99_temperature DESC
| LIMIT 10`,
      },
      {
        id: 'iot_alerts_by_site',
        question: i18n.translate('xpack.searchHomepage.analytics.useCases.iot.alertsBySite', {
          defaultMessage: 'Which sites have the highest share of out-of-range readings?',
        }),
        esql: `FROM ${IOT_INDEX}
| EVAL is_alert = CASE(event.action == "threshold_exceeded", 1, 0)
| STATS events = COUNT(*), alerts = SUM(is_alert), devices = COUNT_DISTINCT(device.id) BY site.name
| EVAL alert_rate_pct = ROUND(alerts * 100.0 / events, 2)
| SORT alert_rate_pct DESC
| LIMIT 10`,
      },
    ],
  },
  {
    id: 'customerFacing',
    title: i18n.translate('xpack.searchHomepage.analytics.useCases.customerFacing.title', {
      defaultMessage: 'Customer-facing analytics',
    }),
    description: i18n.translate(
      'xpack.searchHomepage.analytics.useCases.customerFacing.description',
      {
        defaultMessage: 'Serve usage and performance analytics to your own customers.',
      }
    ),
    iconType: 'users',
    indexPattern: CUSTOMER_FACING_INDEX,
    starterQueries: [
      {
        id: 'customer_facing_usage_by_tenant',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.customerFacing.usageByTenant',
          { defaultMessage: 'Which tenants use the product the most?' }
        ),
        esql: `FROM ${CUSTOMER_FACING_INDEX}
| STATS events = COUNT(*), active_users = COUNT_DISTINCT(user.id) BY tenant.id
| SORT events DESC
| LIMIT 10`,
      },
      {
        id: 'customer_facing_tenant_latency',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.customerFacing.tenantLatency',
          { defaultMessage: 'How fast are API requests for each tenant?' }
        ),
        esql: `FROM ${CUSTOMER_FACING_INDEX}
| WHERE event.action == "api_request"
| STATS requests = COUNT(*), p50_ms = PERCENTILE(request.duration_ms, 50), p95_ms = PERCENTILE(request.duration_ms, 95) BY tenant.id
| SORT p95_ms DESC
| LIMIT 10`,
      },
      {
        id: 'customer_facing_daily_activity',
        question: i18n.translate(
          'xpack.searchHomepage.analytics.useCases.customerFacing.dailyActivity',
          { defaultMessage: 'How many tenants and users are active each day?' }
        ),
        esql: `FROM ${CUSTOMER_FACING_INDEX}
| STATS active_tenants = COUNT_DISTINCT(tenant.id), active_users = COUNT_DISTINCT(user.id) BY day = BUCKET(@timestamp, 1 day)
| EVAL users_per_tenant = ROUND(active_users * 1.0 / active_tenants, 1)
| SORT day`,
      },
    ],
  },
];
