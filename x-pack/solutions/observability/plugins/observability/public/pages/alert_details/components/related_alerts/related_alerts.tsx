/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import { AlertsGrouping } from '@kbn/alerts-grouping';
import { i18n } from '@kbn/i18n';
import { ALERT_GROUP, ALERT_RULE_UUID, ALERT_UUID, AlertStatus, TAGS } from '@kbn/rule-data-utils';
import React, { useEffect, useState } from 'react';
import { ObservabilityAlertsTable, TopAlert } from '../../../..';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';
import {
  getRelatedAlertKuery,
  getSharedFields,
} from '../../../../../common/utils/alerting/get_related_alerts_query';
import { ObservabilityFields } from '../../../../../common/utils/alerting/types';
import { DEFAULT_GROUPING_OPTIONS } from '../../../../components/alerts_table/grouping/constants';
import { getAggregationsByGroupingField } from '../../../../components/alerts_table/grouping/get_aggregations_by_grouping_field';
import { getGroupStats } from '../../../../components/alerts_table/grouping/get_group_stats';
import { GroupingToolbarControls } from '../../../../components/alerts_table/grouping/grouping_toolbar_controls';
import { renderGroupPanel } from '../../../../components/alerts_table/grouping/render_group_panel';
import { AlertsByGroupingAgg } from '../../../../components/alerts_table/types';
import { RELATED_ALERTS_TABLE_CONFIG_ID } from '../../../../constants';
import { buildEsQuery } from '../../../../utils/build_es_query';
import { useKibana } from '../../../../utils/kibana_react';
import { EmptyState } from './empty_state';
import { StatusFilter, getAssociatedStatusFilter } from './status_filter';

const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.related.alerts.table';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

export function RelatedAlerts({ alert }: Props) {
  const { http, notifications, dataViews } = useKibana().services;

  const tagsCheckboxId = useGeneratedHtmlId({ prefix: 'tags' });
  const groupsCheckboxId = useGeneratedHtmlId({ prefix: 'groups' });
  const ruleCheckboxId = useGeneratedHtmlId({ prefix: 'rule' });

  const [tagsChecked, setTagsChecked] = useState(false);
  const [groupsChecked, setGroupsChecked] = useState(false);
  const [ruleChecked, setRuleChecked] = useState(false);

  const [range, setRange] = useState({ from: 'now-24h', to: 'now' });
  const [status, setStatus] = useState<AlertStatus | undefined>('active');

  if (!alert) {
    return null;
  }

  const statusFilter = getAssociatedStatusFilter(status);
  const kuery = getKuery({ alert, tagsChecked, groupsChecked, ruleChecked });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiCheckbox
            id={tagsCheckboxId}
            label={i18n.translate('xpack.observability.relatedAlerts.useTagsLabel', {
              defaultMessage: 'Use tags',
            })}
            checked={tagsChecked}
            onChange={(e) => setTagsChecked(e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckbox
            id={groupsCheckboxId}
            label={i18n.translate('xpack.observability.relatedAlerts.useGroupsLabel', {
              defaultMessage: 'Use groups',
            })}
            checked={groupsChecked}
            onChange={(e) => setGroupsChecked(e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCheckbox
            id={ruleCheckboxId}
            label={i18n.translate('xpack.observability.relatedAlerts.useRuleLabel', {
              defaultMessage: 'Use rule',
            })}
            checked={ruleChecked}
            onChange={(e) => setRuleChecked(e.target.checked)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatusFilter
            status={status}
            onChange={(newStatus?: AlertStatus) => setStatus(newStatus)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        {!kuery && <EmptyState />}
        {kuery && (
          <AlertsGrouping<AlertsByGroupingAgg>
            ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
            consumers={observabilityAlertFeatureIds}
            from={range.from}
            to={range.to}
            defaultFilters={statusFilter ? [statusFilter] : []}
            globalFilters={statusFilter ? [statusFilter] : []}
            globalQuery={{ query: kuery, language: 'kuery' }}
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
                filters: statusFilter ? groupingFilters.concat(statusFilter) : groupingFilters,
                timeRange: range,
                kuery,
              });

              return (
                <ObservabilityAlertsTable
                  id={ALERTS_TABLE_ID}
                  ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
                  consumers={observabilityAlertFeatureIds}
                  query={groupQuery}
                  initialPageSize={ALERTS_PER_PAGE}
                  renderAdditionalToolbarControls={() => (
                    <GroupingToolbarControls
                      groupingId={RELATED_ALERTS_TABLE_CONFIG_ID}
                      ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
                    />
                  )}
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

function getKuery({
  alert,
  tagsChecked,
  groupsChecked,
  ruleChecked,
}: {
  alert: TopAlert<ObservabilityFields>;
  tagsChecked: boolean;
  groupsChecked: boolean;
  ruleChecked: boolean;
}): string {
  const alertId = alert.fields[ALERT_UUID];
  const tags = tagsChecked ? alert.fields[TAGS] : [];
  const groups = groupsChecked ? alert.fields[ALERT_GROUP] : [];
  const ruleId = ruleChecked ? alert.fields[ALERT_RULE_UUID] : undefined;
  const sharedFields = getSharedFields(alert.fields);

  return getRelatedAlertKuery({ tags, groups, ruleId, sharedFields });
}
