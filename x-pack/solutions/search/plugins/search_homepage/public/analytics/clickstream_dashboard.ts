/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';

const FUNNEL_ACTIONS = '"page_view", "product_view", "add_to_cart", "checkout_started", "purchase"';

/**
 * Panels for the clickstream sample events: who is active, what they are worth, where sessions
 * leave the purchase funnel and which campaigns convert. Every panel follows the time picker.
 */
export const buildClickstreamDashboardPanels = (
  indexPattern: string
): NonNullable<DashboardLocatorParams['panels']> => {
  const events = `FROM ${indexPattern} | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;

  return [
    {
      type: 'vis',
      grid: { x: 0, y: 0, w: 12, h: 9 },
      config: {
        type: 'metric',
        title: i18n.translate('xpack.searchHomepage.analytics.clickstreamDashboard.activeUsers', {
          defaultMessage: 'Active users',
        }),
        data_source: {
          type: 'esql',
          query: `${events} | STATS active_users = COUNT_DISTINCT(user.id)`,
        },
        metrics: [
          {
            type: 'primary',
            column: 'active_users',
            label: i18n.translate(
              'xpack.searchHomepage.analytics.clickstreamDashboard.activeUsersLabel',
              {
                defaultMessage: 'Users with at least one event',
              }
            ),
          },
        ],
      },
    },
    {
      type: 'vis',
      grid: { x: 12, y: 0, w: 12, h: 9 },
      config: {
        type: 'metric',
        title: i18n.translate('xpack.searchHomepage.analytics.clickstreamDashboard.revenue', {
          defaultMessage: 'Revenue (USD)',
        }),
        data_source: {
          type: 'esql',
          query: `${events} | STATS revenue = ROUND(SUM(order.total))`,
        },
        metrics: [
          {
            type: 'primary',
            column: 'revenue',
            label: i18n.translate(
              'xpack.searchHomepage.analytics.clickstreamDashboard.revenueLabel',
              {
                defaultMessage: 'Total value of purchases',
              }
            ),
          },
        ],
      },
    },
    {
      type: 'vis',
      grid: { x: 24, y: 0, w: 24, h: 9 },
      config: {
        type: 'xy',
        title: i18n.translate(
          'xpack.searchHomepage.analytics.clickstreamDashboard.eventsOverTime',
          { defaultMessage: 'Events over time by action' }
        ),
        layers: [
          {
            type: 'area_stacked',
            data_source: {
              type: 'esql',
              query: `${events} | STATS events = COUNT(*) BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend), event.action`,
            },
            x: { column: 'bucket' },
            y: [
              {
                column: 'events',
                label: i18n.translate(
                  'xpack.searchHomepage.analytics.clickstreamDashboard.eventsAxis',
                  {
                    defaultMessage: 'Events',
                  }
                ),
              },
            ],
            breakdown_by: { column: 'event.action' },
          },
        ],
        legend: { visibility: 'visible', position: 'right' },
      },
    },
    {
      type: 'vis',
      grid: { x: 0, y: 9, w: 24, h: 13 },
      config: {
        type: 'xy',
        title: i18n.translate('xpack.searchHomepage.analytics.clickstreamDashboard.funnel', {
          defaultMessage: 'Purchase funnel: sessions reaching each step',
        }),
        layers: [
          {
            type: 'bar_horizontal',
            data_source: {
              type: 'esql',
              query: `${events} | WHERE event.action IN (${FUNNEL_ACTIONS}) | STATS sessions = COUNT_DISTINCT(session.id) BY event.action | SORT sessions DESC`,
            },
            x: { column: 'event.action' },
            y: [
              {
                column: 'sessions',
                label: i18n.translate(
                  'xpack.searchHomepage.analytics.clickstreamDashboard.sessionsAxis',
                  {
                    defaultMessage: 'Sessions',
                  }
                ),
              },
            ],
          },
        ],
      },
    },
    {
      type: 'vis',
      grid: { x: 24, y: 9, w: 24, h: 13 },
      config: {
        type: 'xy',
        title: i18n.translate(
          'xpack.searchHomepage.analytics.clickstreamDashboard.campaignConversion',
          { defaultMessage: 'Sessions that end in a purchase, by campaign (%)' }
        ),
        layers: [
          {
            type: 'bar_horizontal',
            data_source: {
              type: 'esql',
              query: `${events} | WHERE campaign.name IS NOT NULL | STATS sessions = COUNT_DISTINCT(session.id), orders = COUNT(order.id) BY campaign.name | EVAL conversion_pct = ROUND(orders * 100.0 / sessions, 1) | SORT conversion_pct DESC | KEEP campaign.name, conversion_pct`,
            },
            x: { column: 'campaign.name' },
            y: [
              {
                column: 'conversion_pct',
                label: i18n.translate(
                  'xpack.searchHomepage.analytics.clickstreamDashboard.conversionAxis',
                  {
                    defaultMessage: 'Conversion rate (%)',
                  }
                ),
              },
            ],
          },
        ],
      },
    },
    {
      type: 'vis',
      grid: { x: 0, y: 22, w: 48, h: 12 },
      config: {
        type: 'xy',
        title: i18n.translate(
          'xpack.searchHomepage.analytics.clickstreamDashboard.revenueOverTime',
          { defaultMessage: 'Revenue over time by product category (USD)' }
        ),
        layers: [
          {
            type: 'bar_stacked',
            data_source: {
              type: 'esql',
              query: `${events} | WHERE event.action == "purchase" | STATS revenue = ROUND(SUM(order.total), 2) BY bucket = BUCKET(@timestamp, 20, ?_tstart, ?_tend), product.category`,
            },
            x: { column: 'bucket' },
            y: [
              {
                column: 'revenue',
                label: i18n.translate(
                  'xpack.searchHomepage.analytics.clickstreamDashboard.revenueAxis',
                  {
                    defaultMessage: 'Revenue (USD)',
                  }
                ),
              },
            ],
            breakdown_by: { column: 'product.category' },
          },
        ],
        legend: { visibility: 'visible', position: 'right' },
      },
    },
  ];
};
