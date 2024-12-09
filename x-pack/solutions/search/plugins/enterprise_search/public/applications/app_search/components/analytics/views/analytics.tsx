/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AnalyticsLogic, AnalyticsCards, AnalyticsChart, convertToChartData } from '..';
import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { CursorIcon } from '../../../icons';

import {
  ENGINE_ANALYTICS_TOP_QUERIES_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH,
  ENGINE_ANALYTICS_RECENT_QUERIES_PATH,
} from '../../../routes';
import { DataPanel } from '../../data_panel';
import { generateEnginePath } from '../../engine';

import { SuggestedCurationsCallout } from '../../engine_overview/components/suggested_curations_callout';
import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsSection, AnalyticsTable, RecentQueriesTable } from '../components';
import {
  ANALYTICS_TITLE,
  TOTAL_QUERIES,
  TOTAL_QUERIES_NO_RESULTS,
  TOTAL_CLICKS,
  TOP_QUERIES,
  TOP_QUERIES_NO_RESULTS,
  TOP_QUERIES_WITH_CLICKS,
  TOP_QUERIES_NO_CLICKS,
  RECENT_QUERIES,
} from '../constants';

import './analytics.scss';

export const Analytics: React.FC = () => {
  const {
    totalQueries,
    totalQueriesNoResults,
    totalClicks,
    queriesPerDay,
    queriesNoResultsPerDay,
    clicksPerDay,
    startDate,
    topQueries,
    topQueriesNoResults,
    topQueriesWithClicks,
    topQueriesNoClicks,
    recentQueries,
  } = useValues(AnalyticsLogic);

  return (
    <AnalyticsLayout isAnalyticsView title={ANALYTICS_TITLE}>
      <SuggestedCurationsCallout />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={1}>
          <AnalyticsCards
            stats={[
              {
                stat: totalQueries,
                text: TOTAL_QUERIES,
                dataTestSubj: 'TotalQueriesCard',
              },
              {
                stat: totalQueriesNoResults,
                text: TOTAL_QUERIES_NO_RESULTS,
                dataTestSubj: 'TotalQueriesNoResultsCard',
              },
              {
                stat: totalClicks,
                text: TOTAL_CLICKS,
                dataTestSubj: 'TotalClicksCard',
              },
            ]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiPanel hasBorder>
            <AnalyticsChart
              lines={[
                {
                  id: TOTAL_QUERIES,
                  data: convertToChartData({ startDate, data: queriesPerDay }),
                },
                {
                  id: TOTAL_QUERIES_NO_RESULTS,
                  data: convertToChartData({ startDate, data: queriesNoResultsPerDay }),
                  isDashed: true,
                },
                {
                  id: TOTAL_CLICKS,
                  data: convertToChartData({ startDate, data: clicksPerDay }),
                  isDashed: true,
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />

      <EuiSpacer />

      <AnalyticsSection
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryTablesTitle',
          { defaultMessage: 'Query analytics' }
        )}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.queryTablesDescription',
          {
            defaultMessage:
              'Gain insight into the most frequent queries, and which queries returned no results.',
          }
        )}
        iconType="search"
      >
        <EuiFlexGroup className="analyticsOverviewTables">
          <EuiFlexItem>
            <DataPanel
              title={<h3>{TOP_QUERIES}</h3>}
              filled
              action={<ViewAllButton to={generateEnginePath(ENGINE_ANALYTICS_TOP_QUERIES_PATH)} />}
            >
              <AnalyticsTable items={topQueries.slice(0, 10)} hasClicks isSmall />
            </DataPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <DataPanel
              title={<h3>{TOP_QUERIES_NO_RESULTS}</h3>}
              filled
              action={
                <ViewAllButton
                  to={generateEnginePath(ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH)}
                />
              }
            >
              <AnalyticsTable items={topQueriesNoResults.slice(0, 10)} isSmall />
            </DataPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </AnalyticsSection>
      <EuiSpacer size="xl" />

      <AnalyticsSection
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.clickTablesTitle',
          { defaultMessage: 'Click analytics' }
        )}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.clickTablesDescription',
          {
            defaultMessage: 'Discover which queries generated the most and least amount of clicks.',
          }
        )}
        iconType={CursorIcon}
      >
        <EuiFlexGroup className="analyticsOverviewTables">
          <EuiFlexItem>
            <DataPanel
              title={<h3>{TOP_QUERIES_WITH_CLICKS}</h3>}
              filled
              action={
                <ViewAllButton
                  to={generateEnginePath(ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH)}
                />
              }
            >
              <AnalyticsTable items={topQueriesWithClicks.slice(0, 10)} hasClicks isSmall />
            </DataPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <DataPanel
              title={<h3>{TOP_QUERIES_NO_CLICKS}</h3>}
              filled
              action={
                <ViewAllButton
                  to={generateEnginePath(ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH)}
                />
              }
            >
              <AnalyticsTable items={topQueriesNoClicks.slice(0, 10)} isSmall />
            </DataPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </AnalyticsSection>
      <EuiSpacer size="xl" />

      <DataPanel
        hasBorder
        title={<h2>{RECENT_QUERIES}</h2>}
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.analytics.recentQueriesDescription',
          { defaultMessage: 'A view into queries happening right now.' }
        )}
        action={<ViewAllButton to={generateEnginePath(ENGINE_ANALYTICS_RECENT_QUERIES_PATH)} />}
      >
        <RecentQueriesTable items={recentQueries.slice(0, 10)} />
      </DataPanel>
    </AnalyticsLayout>
  );
};

export const ViewAllButton: React.FC<{ to: string }> = ({ to }) => (
  <EuiButtonEmptyTo to={to} size="s" iconType="eye">
    {i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.viewAllButtonLabel', {
      defaultMessage: 'View all',
    })}
  </EuiButtonEmptyTo>
);
