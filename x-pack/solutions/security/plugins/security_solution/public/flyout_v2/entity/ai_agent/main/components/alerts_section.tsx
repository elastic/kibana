/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash/fp';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { getSeverityColor } from '../../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useAiAgentAlerts } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import type { AgentAlert } from '../../../../../entity_analytics/components/ai_agents/types';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ALERT_PROCESS,
  ALERT_RULE,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_TIME,
  ALERTS_NONE,
  ALERTS_TITLE,
  ALERTS_UNAVAILABLE,
} from '../translations';

/** Alerts stamped with the agent ID, including those on its descendants. Each opens the alert flyout. */
export const AlertsSection = memo(({ entityId }: { entityId: string }) => {
  const { data, isLoading } = useAiAgentAlerts(entityId);
  const { openDocumentFlyoutFromIndexAsChild } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();

  const columns = useMemo<Array<EuiBasicTableColumn<AgentAlert>>>(
    () => [
      {
        field: 'ruleName',
        name: ALERT_RULE,
        render: (ruleName: string | undefined, alert: AgentAlert) => (
          <EuiLink
            onClick={() =>
              openDocumentFlyoutFromIndexAsChild({
                documentId: alert.id,
                indexName: alert.index,
                renderCellActions: cellActionRenderer,
                onAlertUpdated: noop,
                origin: FLYOUT_ORIGIN.INSIGHTS_ALERTS,
                title: ruleName,
              })
            }
          >
            {ruleName ?? alert.id}
          </EuiLink>
        ),
      },
      {
        field: 'severity',
        name: ALERT_SEVERITY,
        width: '90px',
        render: (severity: string | undefined) =>
          severity ? (
            <EuiHealth color={getSeverityColor(severity, euiTheme)}>{severity}</EuiHealth>
          ) : null,
      },
      { field: 'processName', name: ALERT_PROCESS, width: '110px' },
      { field: 'status', name: ALERT_STATUS, width: '90px' },
      {
        field: 'timestamp',
        name: ALERT_TIME,
        width: '150px',
        render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
      },
    ],
    [openDocumentFlyoutFromIndexAsChild, euiTheme]
  );

  const bySeverity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of data?.alerts ?? []) {
      const severity = alert.severity ?? 'unknown';
      counts.set(severity, (counts.get(severity) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [data]);

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.alerts}>
      <EuiTitle size="xxs">
        <h3>{ALERTS_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : data?.unavailable ? (
        <EuiText size="xs" color="subdued">
          {ALERTS_UNAVAILABLE}
        </EuiText>
      ) : !data || data.alerts.length === 0 ? (
        <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.alertsNone}>
          {ALERTS_NONE}
        </EuiText>
      ) : (
        <>
          <EuiFlexGroup gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.count"
                  defaultMessage="{count, plural, one {# alert} other {# alerts}}"
                  values={{ count: data.alerts.length }}
                />
              </EuiText>
            </EuiFlexItem>
            {bySeverity.map(([severity, count]) => (
              <EuiFlexItem grow={false} key={severity}>
                <EuiHealth color={getSeverityColor(severity, euiTheme)}>
                  <EuiText size="xs">{`${severity} ${count}`}</EuiText>
                </EuiHealth>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiBasicTable<AgentAlert>
            items={data.alerts.slice(0, 20)}
            columns={columns}
            compressed
            tableCaption={ALERTS_TITLE}
          />
        </>
      )}
    </div>
  );
});
AlertsSection.displayName = 'AlertsSection';
