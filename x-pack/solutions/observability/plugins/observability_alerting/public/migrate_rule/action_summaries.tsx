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
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { parse } from 'yaml';
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
    { defaultMessage: 'Message replaced with the rule type default' }
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

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const parseParams = (params: string): Record<string, unknown> => {
  try {
    return getRecord(parse(params));
  } catch {
    return {};
  }
};

const toChannel = (channel: string | undefined): string | undefined =>
  channel ? `#${channel.replace(/^#/, '')}` : undefined;

interface MessageConfig {
  recipients: Array<{ title: string; value: string }>;
  subject?: string;
  message?: string;
}

const LIST_LABELS = {
  to: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.to', {
    defaultMessage: 'To',
  }),
  cc: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.cc', {
    defaultMessage: 'Cc',
  }),
  bcc: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.bcc', {
    defaultMessage: 'Bcc',
  }),
  channel: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.channel', {
    defaultMessage: 'Channel',
  }),
  connector: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.connector', {
    defaultMessage: 'Connector',
  }),
  actionGroup: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.actionGroup', {
    defaultMessage: 'Runs on',
  }),
  scope: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.scope', {
    defaultMessage: 'Sends',
  }),
  fires: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.fires', {
    defaultMessage: 'Fires',
  }),
  alertFilter: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.alertFilter', {
    defaultMessage: 'Alert filter',
  }),
  matches: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.matches', {
    defaultMessage: 'Matches',
  }),
  destination: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.destination', {
    defaultMessage: 'Destination',
  }),
  subject: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.subject', {
    defaultMessage: 'Subject',
  }),
  message: i18n.translate('xpack.observabilityAlerting.migrateRule.actions.field.message', {
    defaultMessage: 'Message',
  }),
};

const getEmailConfig = (params: Record<string, unknown>): MessageConfig => ({
  recipients: (['to', 'cc', 'bcc'] as const).flatMap((key) => {
    const value = getStrings(params[key]).join(', ');
    return value ? [{ title: LIST_LABELS[key], value }] : [];
  }),
  subject: getString(params.subject),
  message: getString(params.message),
});

const getSlackConfig = (channel: string | undefined, message: unknown): MessageConfig => ({
  recipients: channel ? [{ title: LIST_LABELS.channel, value: channel }] : [],
  message: getString(message),
});

/** What a classic action sends and to whom. */
const getClassicMessageConfig = ({ actionTypeId, params }: ClassicRuleAction): MessageConfig => {
  if (actionTypeId === '.email') return getEmailConfig(params);
  if (actionTypeId === '.slack') return getSlackConfig(undefined, params.message);
  const subActionParams = getRecord(params.subActionParams);
  const channel =
    getStrings(subActionParams.channelIds)[0] ??
    getStrings(subActionParams.channels)[0] ??
    getStrings(subActionParams.channelNames)[0] ??
    getString(subActionParams.channel);
  return getSlackConfig(toChannel(channel), subActionParams.text ?? params.message);
};

/** What a converted workflow step sends and to whom. */
const getPolicyMessageConfig = ({ stepType, params }: MigratedActionPolicy): MessageConfig => {
  const stepParams = parseParams(params);
  return stepType === 'email'
    ? getEmailConfig(stepParams)
    : getSlackConfig(toChannel(getString(stepParams.channel)), stepParams.text);
};

const getClassicScope = ({ frequency }: ClassicRuleAction): string =>
  frequency?.summary
    ? i18n.translate('xpack.observabilityAlerting.migrateRule.actions.summary', {
        defaultMessage: 'Summary of alerts',
      })
    : i18n.translate('xpack.observabilityAlerting.migrateRule.actions.perAlert', {
        defaultMessage: 'For each alert',
      });

const getClassicFires = ({ frequency }: ClassicRuleAction): string => {
  const notifyWhen = frequency?.notifyWhen ?? 'onActionGroupChange';
  const when = CLASSIC_NOTIFY_WHEN_LABELS[notifyWhen] ?? notifyWhen;
  return notifyWhen === 'onThrottleInterval' && frequency?.throttle
    ? `${when} (${frequency.throttle})`
    : when;
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

interface DetailRow {
  title: string;
  description: ReactNode;
}

const getMessageRows = ({ recipients, subject, message }: MessageConfig): DetailRow[] => [
  ...recipients.map(({ title, value }) => ({ title, description: value })),
  ...(subject ? [{ title: LIST_LABELS.subject, description: subject }] : []),
  ...(message
    ? [
        {
          title: LIST_LABELS.message,
          description: (
            <EuiCodeBlock
              language="text"
              fontSize="s"
              paddingSize="s"
              overflowHeight={240}
              whiteSpace="pre-wrap"
              isCopyable
            >
              {message}
            </EuiCodeBlock>
          ),
        },
      ]
    : []),
];

const ActionCard = ({
  iconType,
  title,
  subtitle,
  rows,
  badges,
  testSubj,
}: {
  iconType: string;
  title: string;
  subtitle: string;
  rows: DetailRow[];
  badges?: ReactNode;
  testSubj: string;
}) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
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
        {badges && (
          <>
            <EuiSpacer size="xs" />
            {badges}
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
    {rows.length > 0 && (
      <>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          compressed
          rowGutterSize="s"
          columnWidths={[1, 3]}
          listItems={rows}
        />
      </>
    )}
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
        const connectorName = connectorNames.get(action.id);
        return (
          <ActionCard
            key={action.uuid ?? action.id}
            iconType={iconType}
            title={connectorName ?? label}
            subtitle={i18n.translate(
              'xpack.observabilityAlerting.migrateRule.actions.classicType',
              { defaultMessage: '{connectorType} action', values: { connectorType: label } }
            )}
            rows={[
              ...(action.group
                ? [{ title: LIST_LABELS.actionGroup, description: action.group }]
                : []),
              { title: LIST_LABELS.scope, description: getClassicScope(action) },
              { title: LIST_LABELS.fires, description: getClassicFires(action) },
              ...(action.alertsFilter
                ? [
                    {
                      title: LIST_LABELS.alertFilter,
                      description: JSON.stringify(action.alertsFilter),
                    },
                  ]
                : []),
              ...getMessageRows(getClassicMessageConfig(action)),
            ]}
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
    {actionPolicies.map((actionPolicy) => {
      const { sourceActionId, stepType, connectorId, policy, notes } = actionPolicy;
      const { label } = getConnectorType(STEP_CONNECTOR_TYPES[stepType]);
      const connectorName = connectorId
        ? connectorNames.get(connectorId) ?? connectorId
        : undefined;
      return (
        <ActionCard
          key={sourceActionId}
          iconType="workflow"
          title={policy.name}
          subtitle={i18n.translate('xpack.observabilityAlerting.migrateRule.actions.policyType', {
            defaultMessage: 'Action policy · {connectorType} workflow',
            values: { connectorType: label },
          })}
          rows={[
            ...(policy.matcher?.tags?.length
              ? [{ title: LIST_LABELS.matches, description: policy.matcher.tags.join(', ') }]
              : []),
            { title: LIST_LABELS.scope, description: getGroupingLabel(policy.grouping) },
            { title: LIST_LABELS.fires, description: getThrottleLabel(policy.throttle) },
            {
              title: LIST_LABELS.destination,
              description: i18n.translate(
                'xpack.observabilityAlerting.migrateRule.actions.destinationValue',
                {
                  defaultMessage: 'New {connectorType} workflow',
                  values: { connectorType: label },
                }
              ),
            },
            ...(connectorName
              ? [{ title: LIST_LABELS.connector, description: connectorName }]
              : []),
            ...getMessageRows(getPolicyMessageConfig(actionPolicy)),
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
          rows={[]}
          testSubj="migrateRuleSkippedAction"
        />
      );
    })}
  </CardList>
);
