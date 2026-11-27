/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
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
import { noop } from 'lodash/fp';
import { getSeverityColor } from '../../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useAiAgentAlerts } from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import { AGENT_ALERTS_MAX_ROWS } from '../../../../../entity_analytics/components/ai_security/constants';
import { countBySeverity, groupAlertsByRule, type AlertGroup } from './alert_groups';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ALERT_COUNT,
  ALERT_RULE,
  ALERT_SEVERITY,
  ALERTS_NONE,
  ALERTS_TITLE,
  ALERTS_UNAVAILABLE,
  alertsTitleWithCount,
  SHOW_FEWER_RULES,
  showAllRules,
} from '../translations';

/** Rule groups shown before "Show all". */
const COLLAPSED_GROUPS = 5;

/**
 * Open alerts stamped with the agent ID, including those on its descendants, grouped by rule with
 * the worst first. Each group opens its newest alert in the alert flyout.
 */
export const AlertsSection = memo(({ entityId }: { entityId: string }) => {
  const { data, isLoading } = useAiAgentAlerts(entityId);
  const { openDocumentFlyoutFromIndexAsChild } = useFlyoutApi();
  const { euiTheme } = useEuiTheme();
  const [showAll, setShowAll] = useState(false);
  const alerts = useMemo(() => data?.alerts ?? [], [data]);
  const groups = useMemo(() => groupAlertsByRule(alerts), [alerts]);
  const bySeverity = useMemo(() => countBySeverity(alerts), [alerts]);

  const columns = useMemo<Array<EuiBasicTableColumn<AlertGroup>>>(
    () => [
      {
        field: 'ruleName',
        name: ALERT_RULE,
        render: (ruleName: string | undefined, { newest }: AlertGroup) => {
          const status = newest.status !== 'open' ? newest.status : undefined;
          const details = [newest.processName, status].filter(Boolean).join(' · ');
          return (
            <div>
              <EuiLink
                onClick={() =>
                  openDocumentFlyoutFromIndexAsChild({
                    documentId: newest.id,
                    indexName: newest.index,
                    renderCellActions: cellActionRenderer,
                    onAlertUpdated: noop,
                    origin: FLYOUT_ORIGIN.INSIGHTS_ALERTS,
                    title: ruleName,
                  })
                }
              >
                {ruleName ?? newest.id}
              </EuiLink>
              {details && (
                <EuiText size="xs" color="subdued">
                  {details}
                </EuiText>
              )}
            </div>
          );
        },
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
        field: 'count',
        name: ALERT_COUNT,
        width: '64px',
        align: 'right',
      },
    ],
    [openDocumentFlyoutFromIndexAsChild, euiTheme]
  );

  const hasAlerts = !isLoading && !data?.unavailable && alerts.length > 0;
  const title = hasAlerts
    ? alertsTitleWithCount(
        alerts.length >= AGENT_ALERTS_MAX_ROWS ? `${AGENT_ALERTS_MAX_ROWS}+` : `${alerts.length}`
      )
    : ALERTS_TITLE;

  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.alerts}>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3 data-test-subj={AI_AGENT_TEST_IDS.alertsCount}>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {hasAlerts &&
          bySeverity.map(([severity, count]) => (
            <EuiFlexItem grow={false} key={severity}>
              <EuiHealth color={getSeverityColor(severity, euiTheme)}>
                <EuiText size="xs">{`${severity} ${count}`}</EuiText>
              </EuiHealth>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : data?.unavailable ? (
        <EuiText size="s" color="subdued">
          {ALERTS_UNAVAILABLE}
        </EuiText>
      ) : !hasAlerts ? (
        <EuiText size="s" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.alertsNone}>
          {ALERTS_NONE}
        </EuiText>
      ) : (
        <>
          <EuiBasicTable<AlertGroup>
            items={showAll ? groups : groups.slice(0, COLLAPSED_GROUPS)}
            itemId="key"
            columns={columns}
            compressed
            responsiveBreakpoint={false}
            tableCaption={title}
          />
          {groups.length > COLLAPSED_GROUPS && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType={showAll ? 'chevronSingleUp' : 'chevronSingleDown'}
              onClick={() => setShowAll((current) => !current)}
              data-test-subj={AI_AGENT_TEST_IDS.alertsShowAll}
            >
              {showAll ? SHOW_FEWER_RULES : showAllRules(groups.length)}
            </EuiButtonEmpty>
          )}
        </>
      )}
    </div>
  );
});
AlertsSection.displayName = 'AlertsSection';
