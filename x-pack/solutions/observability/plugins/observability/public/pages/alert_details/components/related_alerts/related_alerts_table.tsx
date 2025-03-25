/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { ALERT_START } from '@kbn/rule-data-utils';
import React, { useState } from 'react';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { getColumns } from '../../../../components/alerts_table/common/get_columns';
import { useCaseActions } from '../../../../components/alert_actions/use_case_actions';
import AlertActions from '../../../../components/alert_actions/alert_actions';
import { AlertData } from '../../../../hooks/use_fetch_alert_detail';
import {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  observabilityFeatureId,
  ObservabilityPublicStart,
} from '../../../..';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import { AlertsFlyoutBody } from '../../../../components/alerts_flyout/alerts_flyout_body';
import { AlertsFlyoutFooter } from '../../../../components/alerts_flyout/alerts_flyout_footer';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '../../../../../common/constants';
import { AlertsTableCellValue } from '../../../../components/alerts_table/common/cell_value';
import { casesFeatureId } from '../../../../../common';

interface Props {
  alertData: AlertData;
}

const columns = getColumns({ showRuleName: true });
const initialSort = [
  {
    [ALERT_START]: {
      order: 'desc' as SortOrder,
    },
  },
];

const caseConfiguration: GetObservabilityAlertsTableProp<'casesConfiguration'> = {
  featureId: casesFeatureId,
  owner: [observabilityFeatureId],
};

export function RelatedAlertsTable({ alertData }: Props) {
  const { formatted: alert } = alertData;
  const {
    data,
    http,
    notifications,
    fieldFormats,
    application,
    licensing,
    cases,
    settings,
    observability,
  } = useKibana<{ observability: ObservabilityPublicStart }>().services;
  // const { data, isLoading, isError } = useRelatedAlertsSearch({ alert });

  const [flyoutAlert, setFlyoutAlert] = useState<Alert | null>(null);
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number>(0);
  const { observabilityRuleTypeRegistry, config } = usePluginContext();
  const [selectedAlerts, setSelectedAlerts] = useState<Alert[]>([]);

  const services = useKibana().services;
  const { handleAddToExistingCaseClick } = useCaseActions({
    alerts: selectedAlerts,
    refresh: () => {},
  });

  // const columns: Array<EuiBasicTableColumn<Alert>> = [
  //   {
  //     name: i18n.translate('xpack.observability.relatedAlertsView.columns.actionsColumnTitle', {
  //       defaultMessage: 'Actions',
  //     }),
  //     width: '100px',
  //     render: (item: Alert) => {
  //       return (
  //         <AlertActions
  //           alert={item}
  //           refresh={() => {}}
  //           observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
  //           openAlertInFlyout={(alertId: string) => {
  //             setFlyoutAlert(item);
  //             const flyoutIndex = data?.alerts.findIndex((al) => al._id === item._id);
  //             setFlyoutAlertIndex(flyoutIndex ?? 0);
  //           }}
  //         />
  //       );
  //     },
  //   },
  //   {
  //     field: ALERT_STATUS,
  //     name: 'Status',
  //     render: (_, item: Alert) => {
  //       const value = getAlertFieldValue(item, ALERT_STATUS);
  //       if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
  //         // NOTE: This should only be needed to narrow down the type.
  //         // Status should be either "active" or "recovered".
  //         return null;
  //       }
  //       return <EuiBadge color={value === 'active' ? 'danger' : 'success'}>{value}</EuiBadge>;
  //     },
  //     width: '150',
  //   },
  //   {
  //     field: ALERT_RULE_NAME,
  //     name: 'Rule',
  //     truncateText: true,
  //     render: (_, item: Alert) => {
  //       const ruleName = getAlertFieldValue(item, ALERT_RULE_NAME);
  //       const ruleType = getAlertFieldValue(item, ALERT_RULE_CATEGORY);
  //       return (
  //         <div>
  //           <EuiButtonEmpty
  //             flush="left"
  //             data-test-subj="o11yColumnsButton"
  //             size="s"
  //             onClick={() => {
  //               setFlyoutAlert(item);
  //               const flyoutIndex = data?.alerts.findIndex((al) => al._id === item._id);
  //               setFlyoutAlertIndex(flyoutIndex ?? 0);
  //             }}
  //           >
  //             {ruleName}
  //           </EuiButtonEmpty>
  //           <EuiText size="s">{ruleType}</EuiText>
  //         </div>
  //       );
  //     },
  //   },
  //   {
  //     field: ALERT_INSTANCE_ID,
  //     name: 'Group',
  //     truncateText: true,
  //     render: (_, item: Alert) => {
  //       const instanceId = getAlertFieldValue(item, ALERT_INSTANCE_ID);
  //       return <EuiText size="s">{instanceId}</EuiText>;
  //     },
  //   },
  //   {
  //     field: 'relation',
  //     name: i18n.translate('xpack.observability.relatedAlertsView.relation', {
  //       defaultMessage: 'Relation',
  //     }),
  //     render: (_, item: Alert) => {
  //       const instanceId = getAlertFieldValue(item, ALERT_INSTANCE_ID);
  //       const tags = getAlertFieldValue(item, ALERT_RULE_TAGS);
  //       const ruleUuid = getAlertFieldValue(item, ALERT_RULE_UUID);
  //       const hasSomeRelationWithInstance =
  //         intersection(alert.fields[ALERT_INSTANCE_ID].split(','), instanceId.split(',')).length >
  //         0;
  //       const hasSomeRelationWithTags =
  //         intersection(alert.fields[ALERT_RULE_TAGS], tags.split(',')).length > 0;
  //       const hasRelationWithRule = ruleUuid === alert.fields[ALERT_RULE_UUID];
  //       return (
  //         <>
  //           {hasSomeRelationWithInstance && (
  //             <EuiBadge>
  //               {i18n.translate('xpack.observability.columns.groupsBadgeLabel', {
  //                 defaultMessage: 'Groups',
  //               })}
  //             </EuiBadge>
  //           )}
  //           {hasSomeRelationWithTags && (
  //             <EuiBadge>
  //               {i18n.translate('xpack.observability.columns.tagsBadgeLabel', {
  //                 defaultMessage: 'Tags',
  //               })}
  //             </EuiBadge>
  //           )}
  //           {hasRelationWithRule && (
  //             <EuiBadge>
  //               {i18n.translate('xpack.observability.columns.ruleBadgeLabel', {
  //                 defaultMessage: 'Rule',
  //               })}
  //             </EuiBadge>
  //           )}
  //         </>
  //       );
  //     },
  //   },
  // ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        title={i18n.translate(
          'xpack.observability.relatedAlertsView.euiCallOut.relatedAlertsHeuristicsLabel',
          { defaultMessage: 'Related alerts heuristics' }
        )}
        iconType="search"
      >
        <p>
          {i18n.translate('xpack.observability.relatedAlertsView.p.weAreFetchingAlertsLabel', {
            defaultMessage:
              "We are fetching relevant alerts to the current alert based on some heuristics. Soon you'll be able to tweaks the weights applied to these heuristics",
          })}
        </p>
      </EuiCallOut>
      <AlertsTable<ObservabilityAlertsTableContext>
        columns={columns}
        ruleTypeIds={OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES}
        initialSort={initialSort}
        casesConfiguration={caseConfiguration}
        additionalContext={{
          observabilityRuleTypeRegistry,
          config,
        }}
        renderCellValue={AlertsTableCellValue}
        renderActionsCell={AlertActions}
        actionsColumnWidth={120}
        renderFlyoutBody={AlertsFlyoutBody}
        renderFlyoutFooter={AlertsFlyoutFooter}
        showAlertStatusWithFlapping
        services={{
          data,
          http,
          notifications,
          fieldFormats,
          application,
          licensing,
          cases,
          settings,
        }}
      />
    </EuiFlexGroup>
  );
}
