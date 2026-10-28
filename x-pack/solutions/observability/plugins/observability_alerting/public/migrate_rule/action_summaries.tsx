/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ActionMigrationNote,
  ClassicRuleAction,
  MigratedActionPolicy,
  SkippedClassicAction,
} from '@kbn/alerting-v2-plugin/public';

/** Connector display names keyed by connector id. */
export type ConnectorNames = ReadonlyMap<string, string>;

type Policy = MigratedActionPolicy['policy'];

const CONNECTOR_TYPES: Record<string, { label: string; iconType: string }> = {
  '.email': {
    label: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.type.email', {
      defaultMessage: 'Email',
    }),
    iconType: 'mail',
  },
  '.slack': {
    label: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.type.slackWebhook', {
      defaultMessage: 'Slack (webhook)',
    }),
    iconType: 'logoSlack',
  },
  '.slack_api': {
    label: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.type.slackApi', {
      defaultMessage: 'Slack (API)',
    }),
    iconType: 'logoSlack',
  },
  '.slack2': {
    label: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.type.slack', {
      defaultMessage: 'Slack',
    }),
    iconType: 'logoSlack',
  },
};

const getConnectorType = (connectorTypeId: string) =>
  CONNECTOR_TYPES[connectorTypeId] ?? { label: connectorTypeId, iconType: 'bell' };

const STEP_CONNECTOR_TYPES: Record<MigratedActionPolicy['stepType'], string> = {
  email: '.email',
  'slack2.sendMessage': '.slack2',
};

const CLASSIC_NOTIFY_WHEN_LABELS: Record<string, string> = {
  onActionGroupChange: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.notifyWhen.onActionGroupChange',
    { defaultMessage: 'On status changes' }
  ),
  onActiveAlert: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.notifyWhen.onActiveAlert',
    { defaultMessage: 'On check intervals' }
  ),
  onThrottleInterval: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.notifyWhen.onThrottleInterval',
    { defaultMessage: 'On custom action intervals' }
  ),
};

const NOTE_LABELS: Record<ActionMigrationNote, string> = {
  templates_replaced: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.note.templatesReplaced',
    { defaultMessage: 'Message replaced with the default alert summary' }
  ),
  connector_required: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.note.connectorRequired',
    { defaultMessage: 'Needs a Slack connector' }
  ),
  alerts_filter_dropped: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.note.alertsFilterDropped',
    { defaultMessage: 'Alert filter not carried over' }
  ),
};

const SKIPPED_REASON_LABELS: Record<SkippedClassicAction['reason'], string> = {
  unsupported_connector: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.skipped.unsupportedConnector',
    { defaultMessage: 'Connector type not supported by simple action policies' }
  ),
  recovery_group: i18n.translate(
    'xpack.observabilityAlerting.migrateRule.actions.skipped.recoveryGroup',
    { defaultMessage: 'Recovery actions are covered by status-change notifications' }
  ),
};

const getStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const getRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};

/** Who a classic action notifies: email recipients or a Slack channel. */
const getClassicTarget = ({ actionTypeId, params }: ClassicRuleAction): string | undefined => {
  if (actionTypeId === '.email') return getStrings(params.to).join(', ') || undefined;
  const subActionParams = getRecord(params.subActionParams);
  const channel =
    getStrings(subActionParams.channelIds)[0] ??
    getStrings(subActionParams.channels)[0] ??
    getStrings(subActionParams.channelNames)[0] ??
    (typeof subActionParams.channel === 'string' ? subActionParams.channel : undefined);
  return channel ? `#${channel.replace(/^#/, '')}` : undefined;
};

const getClassicFrequency = ({ frequency }: ClassicRuleAction): string => {
  const scope = frequency?.summary
    ? i18n.translate('xpack.observabilityAlerting.migrateRule.actions.summary', {
        defaultMessage: 'Summary of alerts',
      })
    : i18n.translate('xpack.observabilityAlerting.migrateRule.actions.perAlert', {
        defaultMessage: 'For each alert',
      });
  const notifyWhen = frequency?.notifyWhen ?? 'onActionGroupChange';
  const when = CLASSIC_NOTIFY_WHEN_LABELS[notifyWhen] ?? notifyWhen;
  const throttle =
    notifyWhen === 'onThrottleInterval' && frequency?.throttle ? ` (${frequency.throttle})` : '';
  return `${scope} · ${when}${throttle}`;
};

const getGroupingLabel = (grouping: Policy['grouping']): string => {
  switch (grouping?.mode) {
    case 'all':
      return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.grouping.all', {
        defaultMessage: 'All alerts in one notification',
      });
    case 'per_field':
      return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.grouping.perField', {
        defaultMessage: 'Grouped by {fields}',
        values: { fields: grouping.fields.join(', ') },
      });
    default:
      return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.grouping.perAlert', {
        defaultMessage: 'For each alert',
      });
  }
};

const getThrottleLabel = (throttle: Policy['throttle']): string => {
  switch (throttle?.strategy) {
    case 'every_time':
      return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.throttle.everyTime', {
        defaultMessage: 'Every evaluation',
      });
    case 'per_status_interval':
      return i18n.translate(
        'xpack.observabilityAlerting.migrateRule.actions.throttle.perStatusInterval',
        {
          defaultMessage: 'On status changes and every {interval}',
          values: { interval: throttle.interval },
        }
      );
    case 'time_interval':
      return i18n.translate(
        'xpack.observabilityAlerting.migrateRule.actions.throttle.timeInterval',
        { defaultMessage: 'Every {interval}', values: { interval: throttle.interval } }
      );
    default:
      return i18n.translate(
        'xpack.observabilityAlerting.migrateRule.actions.throttle.onStatusChange',
        { defaultMessage: 'On status changes' }
      );
  }
};

const ActionCard = ({
  iconType,
  title,
  subtitle,
  details,
  badges,
  testSubj,
}: {
  iconType: string;
  title: string;
  subtitle: string;
  details: Array<string | undefined>;
  badges?: ReactNode;
  testSubj: string;
}) => (
  <EuiPanel hasBorder paddingSize="s" data-test-subj={testSubj}>
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {subtitle}
        </EuiText>
        {details
          .filter((detail): detail is string => Boolean(detail))
          .map((detail) => (
            <EuiText key={detail} size="xs">
              {detail}
            </EuiText>
          ))}
        {badges && (
          <>
            <EuiSpacer size="xs" />
            {badges}
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const CardList = ({ children }: { children: ReactNode }) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {React.Children.map(children, (child) => (
      <EuiFlexItem grow={false}>{child}</EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export const ClassicActionList = ({
  actions,
  connectorNames,
}: {
  actions: ClassicRuleAction[];
  connectorNames: ConnectorNames;
}) => {
  if (!actions.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.observabilityAlerting.migrateRule.actions.none', {
          defaultMessage: 'No actions',
        })}
      </EuiText>
    );
  }
  return (
    <CardList>
      {actions.map((action) => {
        const { label, iconType } = getConnectorType(action.actionTypeId);
        return (
          <ActionCard
            key={action.uuid ?? action.id}
            iconType={iconType}
            title={connectorNames.get(action.id) ?? label}
            subtitle={label}
            details={[getClassicTarget(action), getClassicFrequency(action)]}
            testSubj="migrateRuleClassicAction"
          />
        );
      })}
    </CardList>
  );
};

export const ActionPolicyList = ({
  actionPolicies,
  skippedActions,
  connectorNames,
}: {
  actionPolicies: MigratedActionPolicy[];
  skippedActions: SkippedClassicAction[];
  connectorNames: ConnectorNames;
}) => (
  <CardList>
    {actionPolicies.map(({ sourceActionId, stepType, connectorId, policy, notes }) => {
      const { label } = getConnectorType(STEP_CONNECTOR_TYPES[stepType]);
      return (
        <ActionCard
          key={sourceActionId}
          iconType="workflow"
          title={policy.name}
          subtitle={i18n.translate('xpack.observabilityAlerting.migrateRule.actions.policyType', {
            defaultMessage: 'Action policy · {connectorType} workflow',
            values: { connectorType: label },
          })}
          details={[
            connectorId ? connectorNames.get(connectorId) : undefined,
            `${getGroupingLabel(policy.grouping)} · ${getThrottleLabel(policy.throttle)}`,
          ]}
          badges={
            notes.length > 0 && (
              <EuiBadgeGroup gutterSize="xs">
                {notes.map((note) => (
                  <EuiBadge key={note} color={note === 'connector_required' ? 'warning' : 'hollow'}>
                    {NOTE_LABELS[note]}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            )
          }
          testSubj="migrateRuleActionPolicy"
        />
      );
    })}
    {skippedActions.map(({ sourceActionId, sourceConnectorTypeId, reason }) => {
      const { label } = getConnectorType(sourceConnectorTypeId);
      return (
        <ActionCard
          key={sourceActionId}
          iconType="minusInCircle"
          title={i18n.translate('xpack.observabilityAlerting.migrateRule.actions.skippedTitle', {
            defaultMessage: '{connectorType} action not migrated',
            values: { connectorType: label },
          })}
          subtitle={SKIPPED_REASON_LABELS[reason]}
          details={[]}
          testSubj="migrateRuleSkippedAction"
        />
      );
    })}
  </CardList>
);
