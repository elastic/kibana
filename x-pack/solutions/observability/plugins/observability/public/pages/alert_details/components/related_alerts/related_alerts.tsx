/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AlertsGrouping } from '@kbn/alerts-grouping';
import { i18n } from '@kbn/i18n';
import { ALERT_GROUP, ALERT_RULE_UUID, AlertStatus, TAGS } from '@kbn/rule-data-utils';
import React, { useState } from 'react';
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
import { GroupValue, GroupsFilter } from './groups_filter';
import { StatusFilter, getAssociatedStatusFilter } from './status_filter';
import { TagsFilter } from './tags_filter';

const ALERTS_PER_PAGE = 50;
const ALERTS_TABLE_ID = 'xpack.observability.related.alerts.table';

interface Props {
  alert?: TopAlert<ObservabilityFields>;
}

export function RelatedAlerts({ alert }: Props) {
  const { http, notifications, dataViews } = useKibana().services;

  const ruleCheckboxId = useGeneratedHtmlId({ prefix: 'rule' });

  const [ruleChecked, setRuleChecked] = useState(false);

  const [range, setRange] = useState({ from: 'now-24h', to: 'now' });
  const [status, setStatus] = useState<AlertStatus | undefined>('active');
  const [tags, setTags] = useState<string[]>(alert?.fields[TAGS] ?? []);
  const [groups, setGroups] = useState<GroupValue[]>(alert?.fields[ALERT_GROUP] ?? []);

  if (!alert) {
    return null;
  }

  const statusFilter = getAssociatedStatusFilter(status);
  const kuery = getKuery({ alert, tags, groups, ruleChecked });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="xs" />
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiFlexItem grow>
          <TagsFilter
            availableTags={alert?.fields[TAGS] ?? []}
            tags={tags}
            onChange={(newTags) => setTags(newTags)}
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <GroupsFilter
            availableGroups={alert?.fields[ALERT_GROUP] ?? []}
            groups={groups}
            onChange={(newGroups) => setGroups(newGroups)}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <StatusFilter
            status={status}
            onChange={(newStatus?: AlertStatus) => setStatus(newStatus)}
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFormRow label="Same rule">
            <EuiCheckbox
              id={ruleCheckboxId}
              label={i18n.translate('xpack.observability.relatedAlerts.useRuleLabel', {
                defaultMessage: 'Yes',
              })}
              checked={ruleChecked}
              onChange={(e) => setRuleChecked(e.target.checked)}
            />
          </EuiFormRow>
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
  tags,
  groups,
  ruleChecked,
}: {
  alert: TopAlert<ObservabilityFields>;
  tags: string[];
  groups: GroupValue[];
  ruleChecked: boolean;
}): string {
  // const alertId = alert.fields[ALERT_UUID];
  const ruleId = ruleChecked ? alert.fields[ALERT_RULE_UUID] : undefined;
  const sharedFields = getSharedFields(alert.fields);

  return getRelatedAlertKuery({ tags, groups, ruleId, sharedFields });
}
