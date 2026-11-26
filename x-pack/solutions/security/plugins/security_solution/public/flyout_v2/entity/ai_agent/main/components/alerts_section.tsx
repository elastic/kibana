/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
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
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { getSeverityColor } from '../../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useAiAgentAlerts } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import { AGENT_ALERTS_MAX_ROWS } from '../../../../../entity_analytics/components/ai_agents/constants';
import type { AgentAlert } from '../../../../../entity_analytics/components/ai_agents/types';
import { GeneratedDataBadge } from './generated_data_badge';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ALERT_RULE,
  ALERT_SEVERITY,
  ALERT_TIME,
  ALERTS_NONE,
  ALERTS_TITLE,
  ALERTS_UNAVAILABLE,
} from '../translations';

/** Rows shown in the table; the count above it covers every alert read. */
const ALERTS_TABLE_ROWS = 20;

/** Relative time keeps the column narrow; the tooltip has the full date. */
const ALWAYS_RELATIVE_HOURS = 24 * 365;

/**
 * Alerts stamped with the agent ID, including those on its descendants, in every workflow status
 * (the AI agents page counts open alerts only). Each opens the alert flyout.
 */
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
          <div>
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
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              {[alert.processName, alert.status].some(Boolean) && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {[alert.processName, alert.status].filter(Boolean).join(' · ')}
                  </EuiText>
                </EuiFlexItem>
              )}
              {alert.isMock && (
                <EuiFlexItem grow={false}>
                  <GeneratedDataBadge />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        ),
      },
      {
        field: 'severity',
        name: ALERT_SEVERITY,
        width: '88px',
        render: (severity: string | undefined) =>
          severity ? (
            <EuiBadge color={getSeverityColor(severity, euiTheme)}>{severity}</EuiBadge>
          ) : null,
      },
      {
        field: 'timestamp',
        name: ALERT_TIME,
        width: '104px',
        render: (timestamp: string) => (
          <EuiText size="xs">
            <FormattedRelativePreferenceDate
              value={timestamp}
              relativeThresholdInHrs={ALWAYS_RELATIVE_HOURS}
            />
          </EuiText>
        ),
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
              <EuiText size="xs" data-test-subj={AI_AGENT_TEST_IDS.alertsCount}>
                {data.alerts.length >= AGENT_ALERTS_MAX_ROWS ? (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.countCapped"
                    defaultMessage="{max}+ alerts in any status"
                    values={{ max: AGENT_ALERTS_MAX_ROWS }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.countAnyStatus"
                    defaultMessage="{count, plural, one {# alert} other {# alerts}} in any status"
                    values={{ count: data.alerts.length }}
                  />
                )}
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
            items={data.alerts.slice(0, ALERTS_TABLE_ROWS)}
            columns={columns}
            compressed
            responsiveBreakpoint={false}
            tableCaption={ALERTS_TITLE}
          />
          {data.alerts.length > ALERTS_TABLE_ROWS && (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.alerts.newestShown"
                defaultMessage="The newest {shown} are shown."
                values={{ shown: ALERTS_TABLE_ROWS }}
              />
            </EuiText>
          )}
        </>
      )}
    </div>
  );
});
AlertsSection.displayName = 'AlertsSection';
