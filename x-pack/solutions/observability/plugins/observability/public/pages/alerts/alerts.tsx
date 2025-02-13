/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BoolQuery, Filter } from '@kbn/es-query';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import { loadRuleAggregations } from '@kbn/triggers-actions-ui-plugin/public';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { MaintenanceWindowCallout } from '@kbn/alerts-ui-shared/src/maintenance_window_callout';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { AlertsGrouping } from '@kbn/alerts-grouping';

import { rulesLocatorID } from '../../../common';
import { ALERT_STATUS_FILTER } from '../../components/alert_search_bar/constants';
import { renderGroupPanel } from '../../components/alerts_table/grouping/render_group_panel';
import { getGroupStats } from '../../components/alerts_table/grouping/get_group_stats';
import { getAggregationsByGroupingField } from '../../components/alerts_table/grouping/get_aggregations_by_grouping_field';
import { DEFAULT_GROUPING_OPTIONS } from '../../components/alerts_table/grouping/constants';
import {
  AlertsByGroupingAgg,
  GetObservabilityAlertsTableProp,
} from '../../components/alerts_table/types';
import { ObservabilityAlertSearchBar } from '../../components/alert_search_bar/alert_search_bar';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { useToasts } from '../../hooks/use_toast';
import { RulesParams } from '../../locators/rules';
import { useKibana } from '../../utils/kibana_react';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from '../../components/alert_search_bar/containers';
import { calculateTimeRangeBucketSize } from '../overview/helpers/calculate_bucket_size';
import { getAlertSummaryTimeRange } from '../../utils/alert_summary_widget';
import {
  ALERTS_URL_STORAGE_KEY,
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../common/constants';
import { ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID } from '../../constants';
import { useGetAvailableRulesWithDescriptions } from '../../hooks/use_get_available_rules_with_descriptions';
import { ObservabilityAlertsTable } from '../../components/alerts_table/alerts_table';
import { getColumns } from '../../components/alerts_table/common/get_columns';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { buildEsQuery } from '../../utils/build_es_query';
import { renderRuleStats, RuleStatsState } from './components/rule_stats';
import { mergeBoolQueries } from './helpers/merge_bool_queries';

const ALERTS_SEARCH_BAR_ID = 'alerts-search-bar-o11y';
const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.alerts.alert.table';

const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';
const DEFAULT_FILTERS: Filter[] = [];

const tableColumns = getColumns({ showRuleName: true });

function InternalAlertsPage() {
  const kibanaServices = useKibana().services;
  const {
    charts,
    data,
    http,
    notifications,
    dataViews,
    observabilityAIAssistant,
    share: {
      url: { locators },
    },
    triggersActionsUi: {
      getAlertsSearchBar: AlertsSearchBar,
      getAlertSummaryWidget: AlertSummaryWidget,
    },
    uiSettings,
  } = kibanaServices;
  const { onPageReady } = usePerformanceContext();
  const { toasts } = notifications;
  const {
    query: {
      timefilter: { timefilter: timeFilterService },
    },
  } = data;
  const { ObservabilityPageTemplate } = usePluginContext();
  const alertSearchBarStateProps = useAlertSearchBarStateContainer(ALERTS_URL_STORAGE_KEY, {
    replace: false,
  });

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const ruleTypesWithDescriptions = useGetAvailableRulesWithDescriptions();

  const onUpdate: GetObservabilityAlertsTableProp<'onUpdate'> = ({ isLoading, alertsCount }) => {
    if (!isLoading) {
      onPageReady({
        customMetrics: {
          key1: 'total_alert_count',
          value1: alertsCount,
        },
        meta: {
          rangeFrom: alertSearchBarStateProps.rangeFrom,
          rangeTo: alertSearchBarStateProps.rangeTo,
        },
      });
    }
  };

  useEffect(() => {
    return setScreenContext?.({
      data: ruleTypesWithDescriptions.map((rule) => ({
        name: rule.id,
        value: `${rule.name} ${rule.description}`,
        description: `An available rule is ${rule.name}.`,
      })),
      starterPrompts: [
        {
          title: i18n.translate('xpack.observability.app.starterPrompts.explainRules.title', {
            defaultMessage: 'Explain',
          }),
          prompt: i18n.translate('xpack.observability.app.starterPrompts.explainRules.prompt', {
            defaultMessage: `Can you explain the rule types that are available?`,
          }),
          icon: 'sparkles',
        },
      ],
    });
  }, [filteredRuleTypes, ruleTypesWithDescriptions, setScreenContext]);

  const onBrushEnd: BrushEndListener = (brushEvent) => {
    const { x } = brushEvent as XYBrushEvent;
    if (x) {
      const [start, end] = x;
      alertSearchBarStateProps.onRangeFromChange(new Date(start).toISOString());
      alertSearchBarStateProps.onRangeToChange(new Date(end).toISOString());
    }
  };
  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
    onBrushEnd,
  };
  const [ruleStatsLoading, setRuleStatsLoading] = useState<boolean>(false);
  const [ruleStats, setRuleStats] = useState<RuleStatsState>({
    total: 0,
    disabled: 0,
    muted: 0,
    error: 0,
    snoozed: 0,
  });
  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();
  const timeBuckets = useTimeBuckets();
  const bucketSize = useMemo(
    () =>
      calculateTimeRangeBucketSize(
        {
          from: alertSearchBarStateProps.rangeFrom,
          to: alertSearchBarStateProps.rangeTo,
        },
        timeBuckets
      ),
    [alertSearchBarStateProps.rangeFrom, alertSearchBarStateProps.rangeTo, timeBuckets]
  );
  const alertSummaryTimeRange = useMemo(
    () =>
      getAlertSummaryTimeRange(
        {
          from: alertSearchBarStateProps.rangeFrom,
          to: alertSearchBarStateProps.rangeTo,
        },
        bucketSize?.intervalString || DEFAULT_INTERVAL,
        bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertSearchBarStateProps.rangeFrom, alertSearchBarStateProps.rangeTo, bucketSize, esQuery]
  );

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
      },
    ],
    {
      classicOnly: true,
    }
  );

  async function loadRuleStats() {
    setRuleStatsLoading(true);
    try {
      const response = await loadRuleAggregations({
        http,
        ruleTypeIds: filteredRuleTypes,
        consumers: observabilityAlertFeatureIds,
      });
      const { ruleExecutionStatus, ruleMutedStatus, ruleEnabledStatus, ruleSnoozedStatus } =
        response;
      if (ruleExecutionStatus && ruleMutedStatus && ruleEnabledStatus && ruleSnoozedStatus) {
        const total = Object.values(ruleExecutionStatus).reduce((acc, value) => acc + value, 0);
        const { disabled } = ruleEnabledStatus;
        const { muted } = ruleMutedStatus;
        const { error } = ruleExecutionStatus;
        const { snoozed } = ruleSnoozedStatus;
        setRuleStats({
          ...ruleStats,
          total,
          disabled,
          muted,
          error,
          snoozed,
        });
      }
      setRuleStatsLoading(false);
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.ruleStats.loadError', {
          defaultMessage: 'Unable to load rule stats',
        }),
      });
      setRuleStatsLoading(false);
    }
  }

  useEffect(() => {
    loadRuleStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manageRulesHref = http.basePath.prepend('/app/observability/alerts/rules');

  return (
    <Provider value={alertSearchBarStateContainer}>
      <ObservabilityPageTemplate
        data-test-subj="alertsPageWithData"
        pageHeader={{
          pageTitle: (
            <>{i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })} </>
          ),
          rightSideItems: renderRuleStats(
            ruleStats,
            manageRulesHref,
            ruleStatsLoading,
            locators.get<RulesParams>(rulesLocatorID)
          ),
        }}
      >
        <HeaderMenu />
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <MaintenanceWindowCallout
              kibanaServices={kibanaServices}
              categories={[DEFAULT_APP_CATEGORIES.observability.id]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ObservabilityAlertSearchBar
              {...alertSearchBarStateProps}
              appName={ALERTS_SEARCH_BAR_ID}
              onEsQueryChange={setEsQuery}
              showFilterBar
              services={{ timeFilterService, AlertsSearchBar, useToasts, uiSettings }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertSummaryWidget
              ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
              consumers={observabilityAlertFeatureIds}
              filter={esQuery}
              fullSize
              timeRange={alertSummaryTimeRange}
              chartProps={chartProps}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {esQuery && (
              <AlertsGrouping<AlertsByGroupingAgg>
                ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
                consumers={observabilityAlertFeatureIds}
                defaultFilters={
                  ALERT_STATUS_FILTER[alertSearchBarStateProps.status] ?? DEFAULT_FILTERS
                }
                from={alertSearchBarStateProps.rangeFrom}
                to={alertSearchBarStateProps.rangeTo}
                globalFilters={alertSearchBarStateProps.filters ?? DEFAULT_FILTERS}
                globalQuery={{ query: alertSearchBarStateProps.kuery, language: 'kuery' }}
                groupingId={ALERTS_PAGE_ALERTS_TABLE_CONFIG_ID}
                defaultGroupingOptions={DEFAULT_GROUPING_OPTIONS}
                getAggregationsByGroupingField={getAggregationsByGroupingField}
                renderGroupPanel={renderGroupPanel}
                getGroupStats={getGroupStats}
                services={{
                  notifications,
                  dataViews,
                  http,
                }}
              >
                {(groupingFilters) => {
                  const groupQuery = buildEsQuery({
                    filters: groupingFilters,
                  });
                  return (
                    <ObservabilityAlertsTable
                      id={ALERTS_TABLE_ID}
                      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
                      consumers={observabilityAlertFeatureIds}
                      query={mergeBoolQueries(esQuery, groupQuery)}
                      initialPageSize={ALERTS_PER_PAGE}
                      onUpdate={onUpdate}
                      columns={tableColumns}
                      showInspectButton
                    />
                  );
                }}
              </AlertsGrouping>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </ObservabilityPageTemplate>
    </Provider>
  );
}

export function AlertsPage() {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <InternalAlertsPage />
    </Provider>
  );
}
