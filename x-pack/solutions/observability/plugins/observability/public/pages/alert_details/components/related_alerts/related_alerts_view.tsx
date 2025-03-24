/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiTableSelectionType,
  EuiText,
  EuiSearchBarProps,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import {
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import { intersection, isEmpty } from 'lodash';
import React, { useState } from 'react';
import AlertsFlyout from '@kbn/response-ops-alerts-table/components/alerts_flyout';
import { useCaseActions } from '../../../../components/alert_actions/use_case_actions';
import AlertActions from '../../../../components/alert_actions/alert_actions';
import { AlertData } from '../../../../hooks/use_fetch_alert_detail';
import { ObservabilityRuleTypeRegistry } from '../../../..';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import { useRelatedAlertsSearch } from '../../hooks/related_alerts/use_related_alerts_search';
import { AlertsFlyoutBody } from '../../../../components/alerts_flyout/alerts_flyout_body';
import { AlertsFlyoutFooter } from '../../../../components/alerts_flyout/alerts_flyout_footer';

interface Props {
  alertData: AlertData;
}

export function RelatedAlertsView({ alertData }: Props) {
  const { formatted: alert } = alertData;
  const { data, isLoading, isError } = useRelatedAlertsSearch({ alert });

  const [flyoutAlert, setFlyoutAlert] = useState<Alert | null>(null);
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number>(0);
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const [selectedAlerts, setSelectedAlerts] = useState<Alert[]>([]);

  const services = useKibana().services;
  const { handleAddToExistingCaseClick } = useCaseActions({
    alerts: selectedAlerts,
    refresh: () => {},
  });

  const columns: Array<EuiBasicTableColumn<Alert>> = [
    {
      name: i18n.translate('xpack.observability.relatedAlertsView.columns.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '100px',
      render: (item: Alert) => {
        return (
          <AlertActions
            alert={item}
            refresh={() => {}}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            openAlertInFlyout={(alertId: string) => {
              setFlyoutAlert(item);
              const flyoutIndex = data?.alerts.findIndex((al) => al._id === item._id);
              setFlyoutAlertIndex(flyoutIndex ?? 0);
            }}
          />
        );
      },
    },
    {
      field: ALERT_STATUS,
      name: 'Status',
      render: (_, item: Alert) => {
        const value = getAlertFieldValue(item, ALERT_STATUS);
        if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
          // NOTE: This should only be needed to narrow down the type.
          // Status should be either "active" or "recovered".
          return null;
        }
        return <EuiBadge color={value === 'active' ? 'danger' : 'success'}>{value}</EuiBadge>;
      },
      width: '150',
    },
    {
      field: ALERT_RULE_NAME,
      name: 'Rule',
      truncateText: true,
      render: (_, item: Alert) => {
        const ruleName = getAlertFieldValue(item, ALERT_RULE_NAME);
        const ruleType = getAlertFieldValue(item, ALERT_RULE_CATEGORY);
        return (
          <div>
            <EuiButtonEmpty
              flush="left"
              data-test-subj="o11yColumnsButton"
              size="s"
              onClick={() => {
                setFlyoutAlert(item);
                const flyoutIndex = data?.alerts.findIndex((al) => al._id === item._id);
                setFlyoutAlertIndex(flyoutIndex ?? 0);
              }}
            >
              {ruleName}
            </EuiButtonEmpty>
            <EuiText size="s">{ruleType}</EuiText>
          </div>
        );
      },
    },
    {
      field: ALERT_INSTANCE_ID,
      name: 'Group',
      truncateText: true,
      render: (_, item: Alert) => {
        const instanceId = getAlertFieldValue(item, ALERT_INSTANCE_ID);
        return <EuiText size="s">{instanceId}</EuiText>;
      },
    },
    {
      field: 'relation',
      name: i18n.translate('xpack.observability.relatedAlertsView.relation', {
        defaultMessage: 'Relation',
      }),
      render: (_, item: Alert) => {
        const instanceId = getAlertFieldValue(item, ALERT_INSTANCE_ID);
        const tags = getAlertFieldValue(item, ALERT_RULE_TAGS);
        const ruleUuid = getAlertFieldValue(item, ALERT_RULE_UUID);
        const hasSomeRelationWithInstance =
          intersection(alert.fields[ALERT_INSTANCE_ID].split(','), instanceId.split(',')).length >
          0;
        const hasSomeRelationWithTags =
          intersection(alert.fields[ALERT_RULE_TAGS], tags.split(',')).length > 0;
        const hasRelationWithRule = ruleUuid === alert.fields[ALERT_RULE_UUID];
        return (
          <>
            {hasSomeRelationWithInstance && (
              <EuiBadge>
                {i18n.translate('xpack.observability.columns.groupsBadgeLabel', {
                  defaultMessage: 'Groups',
                })}
              </EuiBadge>
            )}
            {hasSomeRelationWithTags && (
              <EuiBadge>
                {i18n.translate('xpack.observability.columns.tagsBadgeLabel', {
                  defaultMessage: 'Tags',
                })}
              </EuiBadge>
            )}
            {hasRelationWithRule && (
              <EuiBadge>
                {i18n.translate('xpack.observability.columns.ruleBadgeLabel', {
                  defaultMessage: 'Rule',
                })}
              </EuiBadge>
            )}
          </>
        );
      },
    },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  const onSelectionChange = (selected: Alert[]) => {
    setSelectedAlerts(selected);
  };
  const selection: EuiTableSelectionType<Alert> = {
    onSelectionChange,
    selectable: () => true,
  };

  const renderToolsRight = () => {
    return [
      <EuiButton
        data-test-subj="o11yRenderToolsRightLoadUsersButton"
        key="loadUsers"
        onClick={() => {
          handleAddToExistingCaseClick();
        }}
        disabled={selectedAlerts.length === 0}
      >
        {i18n.translate('xpack.observability.relatedAlertsView.openCaseForSelectedButtonLabel', {
          defaultMessage: 'Open case for {count} selected alerts',
          values: {
            count: selectedAlerts.length,
          },
        })}
      </EuiButton>,
    ];
  };

  const search: EuiSearchBarProps = {
    toolsLeft: renderToolsRight(),
    box: {
      incremental: true,
    },
    filters: [],
  };

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
      <EuiInMemoryTable<Alert>
        itemId="_id"
        search={search}
        tableCaption={MOST_RELEVANT_ALERTS}
        items={data?.alerts ?? []}
        rowHeader={ALERT_REASON}
        columns={columns}
        loading={isLoading}
        error={isError ? ERROR_FETCHING : undefined}
        selection={selection}
        tableLayout="auto"
        pagination={true}
      />
      {flyoutAlert && (
        <AlertsFlyout<{ observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry }>
          flyoutIndex={flyoutAlertIndex}
          onClose={() => setFlyoutAlert(null)}
          isLoading={isLoading}
          alert={flyoutAlert}
          alerts={data?.alerts ?? []}
          onPaginate={(page) => {
            setPageIndex(page);
            setFlyoutAlertIndex(page);
            setFlyoutAlert(data?.alerts[page] ?? null);
          }}
          isLoadingAlerts={isLoading}
          refresh={() => {}}
          alertsCount={data?.alerts.length ?? 0}
          isLoadingMutedAlerts={false}
          isLoadingCases={false}
          isLoadingMaintenanceWindows={false}
          pageIndex={pageIndex}
          pageSize={0}
          services={services}
          columns={[]}
          renderFlyoutBody={AlertsFlyoutBody}
          renderFlyoutFooter={AlertsFlyoutFooter}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
        />
      )}
    </EuiFlexGroup>
  );
}

const MOST_RELEVANT_ALERTS = i18n.translate('xpack.observability.relatedAlertsView.mostRelevant', {
  defaultMessage: 'Most relevant alerts to the current one',
});

const ERROR_FETCHING = i18n.translate('xpack.observability.relatedAlertsView.error', {
  defaultMessage: 'Error fetching relevant alerts',
});

export const getAlertFieldValue = (alert: Alert, fieldName: string) => {
  // can be updated when working on https://github.com/elastic/kibana/issues/140819
  const rawValue = alert[fieldName];
  const value = Array.isArray(rawValue) ? rawValue.join() : rawValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return 'Error: Unable to parse JSON value.';
      }
    }
    return value;
  }

  return '--';
};
