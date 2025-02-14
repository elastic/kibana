/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import {
  ALERT_END,
  ALERT_GROUP,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UUID,
  TAGS,
} from '@kbn/rule-data-utils';
import { BoolQuery, Filter, type Query } from '@kbn/es-query';
import { AlertsGrouping } from '@kbn/alerts-grouping';
import { ObservabilityFields } from '../../../../common/utils/alerting/types';

import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../common/constants';
import {
  getRelatedAlertKuery,
  getSharedFields,
} from '../../../../common/utils/alerting/get_related_alerts_query';
import { ObservabilityAlertsTable, TopAlert } from '../../..';
import {
  AlertSearchBarContainerState,
  DEFAULT_STATE,
} from '../../../components/alert_search_bar/containers/state_container';
import { ObservabilityAlertSearchbarWithUrlSync } from '../../../components/alert_search_bar/alert_search_bar_with_url_sync';
import { renderGroupPanel } from '../../../components/alerts_table/grouping/render_group_panel';
import { getGroupStats } from '../../../components/alerts_table/grouping/get_group_stats';
import { getAggregationsByGroupingField } from '../../../components/alerts_table/grouping/get_aggregations_by_grouping_field';
import { DEFAULT_GROUPING_OPTIONS } from '../../../components/alerts_table/grouping/constants';
import { ALERT_STATUS_FILTER } from '../../../components/alert_search_bar/constants';
import { AlertsByGroupingAgg } from '../../../components/alerts_table/types';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from '../../../components/alert_search_bar/containers';
import { RELATED_ALERTS_TABLE_CONFIG_ID, SEARCH_BAR_URL_STORAGE_KEY } from '../../../constants';
import { useKibana } from '../../../utils/kibana_react';
import { buildEsQuery } from '../../../utils/build_es_query';
import { mergeBoolQueries } from '../../alerts/helpers/merge_bool_queries';
import icon from './assets/illustration_product_no_results_magnifying_glass.svg';

const ALERTS_PER_PAGE = 50;
const RELATED_ALERTS_SEARCH_BAR_ID = 'related-alerts-search-bar-o11y';
const ALERTS_TABLE_ID = 'xpack.observability.related.alerts.table';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

const defaultState: AlertSearchBarContainerState = { ...DEFAULT_STATE, status: 'active' };
const DEFAULT_FILTERS: Filter[] = [];

export function InternalRelatedAlerts({ alert }: Props) {
  const kibanaServices = useKibana().services;
  const { http, notifications, dataViews } = kibanaServices;
  const alertSearchBarStateProps = useAlertSearchBarStateContainer(SEARCH_BAR_URL_STORAGE_KEY, {
    replace: false,
  });

  const [esQuery, setEsQuery] = useState<{ bool: BoolQuery }>();
  const alertStart = alert?.fields[ALERT_START];
  const alertEnd = alert?.fields[ALERT_END];
  const alertId = alert?.fields[ALERT_UUID];
  const tags = alert?.fields[TAGS];
  const groups = alert?.fields[ALERT_GROUP];
  const ruleId = alert?.fields[ALERT_RULE_UUID];
  const sharedFields = getSharedFields(alert?.fields);
  const kuery = getRelatedAlertKuery({ tags, groups, ruleId, sharedFields });

  const defaultQuery = useRef<Query[]>([
    { query: `not kibana.alert.uuid: ${alertId}`, language: 'kuery' },
  ]);

  useEffect(() => {
    if (alertStart) {
      const defaultTimeRange = getPaddedAlertTimeRange(alertStart, alertEnd);
      alertSearchBarStateProps.onRangeFromChange(defaultTimeRange.from);
      alertSearchBarStateProps.onRangeToChange(defaultTimeRange.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertStart, alertEnd]);

  if (!kuery || !alert) return <EmptyState />;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiSpacer size="l" />
        <ObservabilityAlertSearchbarWithUrlSync
          appName={RELATED_ALERTS_SEARCH_BAR_ID}
          onEsQueryChange={setEsQuery}
          urlStorageKey={SEARCH_BAR_URL_STORAGE_KEY}
          defaultSearchQueries={defaultQuery.current}
          defaultState={{
            ...defaultState,
            kuery,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {esQuery && (
          <AlertsGrouping<AlertsByGroupingAgg>
            ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
            consumers={observabilityAlertFeatureIds}
            defaultFilters={ALERT_STATUS_FILTER[alertSearchBarStateProps.status] ?? DEFAULT_FILTERS}
            from={alertSearchBarStateProps.rangeFrom}
            to={alertSearchBarStateProps.rangeTo}
            globalFilters={alertSearchBarStateProps.filters ?? DEFAULT_FILTERS}
            globalQuery={{ query: alertSearchBarStateProps.kuery, language: 'kuery' }}
            groupingId={RELATED_ALERTS_TABLE_CONFIG_ID}
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
                  showInspectButton
                />
              );
            }}
          </AlertsGrouping>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const heights = {
  tall: 490,
  short: 250,
};
const panelStyle = {
  maxWidth: 500,
};

function EmptyState() {
  return (
    <EuiPanel color="subdued" data-test-subj="relatedAlertsTabEmptyState">
      <EuiFlexGroup style={{ height: heights.tall }} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} style={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.observability.pages.alertDetails.relatedAlerts.empty.title"
                        defaultMessage="Problem loading related alerts"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.observability.pages.alertDetails.relatedAlerts.empty.description"
                      defaultMessage="Due to an unexpected error, no related alerts can be found."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage style={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function RelatedAlerts(props: Props) {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <InternalRelatedAlerts {...props} />
    </Provider>
  );
}
