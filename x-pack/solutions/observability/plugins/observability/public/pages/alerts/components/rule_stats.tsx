/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { RulesLocatorParams } from '@kbn/deeplinks-observability';

export interface RuleStatsState {
  total: number;
  disabled: number;
  muted: number;
  error: number;
  snoozed: number;
}
type Status = 'disabled' | 'snoozed' | 'error';

const Divider = euiStyled.div`
  border-right: 1px solid ${euiThemeVars.euiColorLightShade};
  height: 100%;
`;

const getStatCount = (stats: RuleStatsState, status: Status) => {
  if (status === 'snoozed') return stats.snoozed + stats.muted;
  return stats[status];
};

const disabledLabel = i18n.translate('xpack.observability.alerts.ruleStats.disabled', {
  defaultMessage: 'Disabled',
});
const snoozedLabel = i18n.translate('xpack.observability.alerts.ruleStats.muted', {
  defaultMessage: 'Snoozed',
});
const errorsLabel = i18n.translate('xpack.observability.alerts.ruleStats.errors', {
  defaultMessage: 'Errors',
});

const ruleCountLabel = i18n.translate('xpack.observability.alerts.ruleStats.ruleCount', {
  defaultMessage: 'Rule count',
});

interface RuleMetricButtonProps {
  label: string;
  count: number;
  isLoading: boolean;
  interactive: boolean;
  onClick?: () => void;
  testSubj: string;
}

function RuleMetricButton({
  label,
  count,
  isLoading,
  interactive,
  onClick,
  testSubj,
}: RuleMetricButtonProps) {
  return (
    <EuiButtonEmpty
      size="s"
      isDisabled={!interactive}
      color="text"
      isLoading={isLoading}
      onClick={interactive ? onClick : undefined}
      data-test-subj={testSubj}
    >
      {label}:{' '}
      <EuiNotificationBadge color={interactive ? 'accent' : 'subdued'}>
        {count}
      </EuiNotificationBadge>
    </EuiButtonEmpty>
  );
}

function buildRuleStatElements(
  ruleStats: RuleStatsState,
  ruleStatsLoading: boolean,
  rulesLocator?: LocatorPublic<RulesLocatorParams>
) {
  const handleNavigateToRules = async (stats: RuleStatsState, status: Status) => {
    const count = getStatCount(stats, status);
    if (count > 0) {
      switch (status) {
        case 'error':
          await rulesLocator?.navigate({ lastResponse: ['failed'] }, { replace: false });
          break;
        case 'snoozed':
        case 'disabled':
          await rulesLocator?.navigate({ status: [status] }, { replace: false });
          break;
        default:
          break;
      }
    }
  };

  const disabledStatsComponent = (
    <RuleMetricButton
      label={disabledLabel}
      count={ruleStats.disabled}
      isLoading={ruleStatsLoading}
      interactive={ruleStats.disabled > 0}
      onClick={() => handleNavigateToRules(ruleStats, 'disabled')}
      testSubj="statDisabled"
    />
  );

  const snoozedCount = ruleStats.muted + ruleStats.snoozed;
  const snoozedStatsComponent = (
    <RuleMetricButton
      label={snoozedLabel}
      count={snoozedCount}
      isLoading={ruleStatsLoading}
      interactive={snoozedCount > 0}
      onClick={() => handleNavigateToRules(ruleStats, 'snoozed')}
      testSubj="statMuted"
    />
  );

  const errorStatsComponent = (
    <RuleMetricButton
      label={errorsLabel}
      count={ruleStats.error}
      isLoading={ruleStatsLoading}
      interactive={ruleStats.error > 0}
      onClick={() => handleNavigateToRules(ruleStats, 'error')}
      testSubj="statErrors"
    />
  );

  const ruleCountStat = (
    <RuleMetricButton
      label={ruleCountLabel}
      count={ruleStats.total}
      isLoading={ruleStatsLoading}
      interactive={false}
      testSubj="statRuleCount"
    />
  );

  return {
    ruleCountStat,
    disabledStatsComponent,
    snoozedStatsComponent,
    errorStatsComponent,
  };
}

export function RuleStatsMetricsRow({
  ruleStats,
  ruleStatsLoading,
  rulesLocator,
}: {
  ruleStats: RuleStatsState;
  ruleStatsLoading: boolean;
  rulesLocator?: LocatorPublic<RulesLocatorParams>;
}) {
  const { ruleCountStat, disabledStatsComponent, snoozedStatsComponent, errorStatsComponent } =
    buildRuleStatElements(ruleStats, ruleStatsLoading, rulesLocator);

  return (
    <EuiFlexGroup
      alignItems="center"
      responsive={true}
      wrap
      justifyContent="flexEnd"
      data-test-subj="o11yAlertsRuleStatsRow"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          wrap
          alignItems="center"
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>{ruleCountStat}</EuiFlexItem>
          <EuiFlexItem grow={false}>{disabledStatsComponent}</EuiFlexItem>
          <EuiFlexItem grow={false}>{snoozedStatsComponent}</EuiFlexItem>
          <EuiFlexItem grow={false}>{errorStatsComponent}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const renderRuleStats = (
  ruleStats: RuleStatsState,
  manageRulesHref: string,
  ruleStatsLoading: boolean,
  rulesLocator?: LocatorPublic<RulesLocatorParams>
) => {
  const { ruleCountStat, disabledStatsComponent, snoozedStatsComponent, errorStatsComponent } =
    buildRuleStatElements(ruleStats, ruleStatsLoading, rulesLocator);

  return [
    ruleCountStat,
    disabledStatsComponent,
    snoozedStatsComponent,
    errorStatsComponent,
    <Divider />,
    <EuiButtonEmpty data-test-subj="manageRulesPageButton" href={manageRulesHref}>
      {i18n.translate('xpack.observability.alerts.manageRulesButtonLabel', {
        defaultMessage: 'Manage Rules',
      })}
    </EuiButtonEmpty>,
  ].reverse();
};
