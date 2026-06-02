/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const FIELD_CHANGES_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.fieldChangesLabel',
  {
    defaultMessage: 'Changed fields',
  }
);

export const VIEW_DETAILS_LINK = (): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.viewDetailsLink"
    defaultMessage="View {icon}"
    values={{
      icon: <EuiIcon type="expand" aria-hidden={true} />,
    }}
  />
);

export const TIMELINE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.timelineAriaLabel',
  {
    defaultMessage: 'Rule change history timeline',
  }
);

export const CURRENT_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.currentVersion',
  { defaultMessage: 'Current version' }
);

export const N_CHANGES = (count: number): string =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.nChanges', {
    defaultMessage: '{count, plural, one {# change} other {# changes}}',
    values: { count },
  });

export const ACTION_LABEL_ENABLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelEnabled',
  { defaultMessage: 'Enabled the rule' }
);

export const ACTION_LABEL_DISABLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelDisabled',
  { defaultMessage: 'Disabled the rule' }
);

export const ACTION_LABEL_SNOOZED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelSnoozed',
  { defaultMessage: 'Snoozed notifications' }
);

export const ACTION_LABEL_UNSNOOZED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelUnsnoozed',
  { defaultMessage: 'Unsnoozed notifications' }
);

export const ACTION_LABEL_API_KEY_UPDATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelApiKeyUpdated',
  { defaultMessage: 'Updated API key' }
);

export const ACTION_LABEL_CREATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelCreated',
  { defaultMessage: 'Created the rule' }
);

export const ACTION_LABEL_UPDATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelUpdated',
  { defaultMessage: 'Updated the rule' }
);

export const ACTION_LABEL_DELETED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelDeleted',
  { defaultMessage: 'Deleted the rule' }
);

export const ACTION_LABEL_INSTALLED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelInstalled',
  { defaultMessage: 'Installed the rule' }
);

export const ACTION_LABEL_UPGRADED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelUpgraded',
  { defaultMessage: 'Upgraded the rule' }
);

export const ACTION_LABEL_DUPLICATED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelDuplicated',
  { defaultMessage: 'Duplicated the rule' }
);

export const ACTION_LABEL_IMPORTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelImported',
  { defaultMessage: 'Imported the rule' }
);

export const ACTION_LABEL_REVERTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actionLabelReverted',
  { defaultMessage: 'Reverted the rule' }
);

export const CHANGED_FIELDS_TOGGLE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changedFieldsToggleAriaLabel',
  { defaultMessage: 'Toggle changed fields' }
);

export const SYSTEM_USER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.systemUserLabel',
  {
    defaultMessage: 'System',
  }
);

export const EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.emptyPromptTitle',
  {
    defaultMessage: 'No change history yet',
  }
);

export const EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.emptyPromptBody',
  {
    defaultMessage:
      'No changes have been recorded for this rule yet. Subsequent edits will appear here.',
  }
);

export const LOADING_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.loadingLabel',
  {
    defaultMessage: 'Loading change history',
  }
);

const REVISION_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revisionActionLabel',
  { defaultMessage: 'Revision' }
);

const ELASTIC_VERSION_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.elasticVersionActionLabel',
  { defaultMessage: 'Elastic version' }
);

interface RuleRevisionMessageProps {
  date: React.ReactNode;
  username: string;
  revision: number;
  fields: React.ReactNode;
}

export const RULE_REVISION_MESSAGE = ({
  date,
  username,
  revision,
  fields,
}: RuleRevisionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleRevisionMessage"
    defaultMessage="On {date} {username} made {actionLabel} {revision} updating the {fields}"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      actionLabel: <strong>{REVISION_ACTION_LABEL}</strong>,
      revision: <EuiBadge>{revision}</EuiBadge>,
      fields,
    }}
  />
);

interface ElasticVersionMessageProps {
  date: React.ReactNode;
  username: string;
  version: number;
  fields: React.ReactNode;
}

export const ELASTIC_VERSION_MESSAGE = ({
  date,
  username,
  version,
  fields,
}: ElasticVersionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.elasticVersionMessage"
    defaultMessage="On {date} {username} made {actionLabel} {version} installing the Elastic update to the {fields}"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      actionLabel: <strong>{ELASTIC_VERSION_ACTION_LABEL}</strong>,
      version: <EuiBadge>{version}</EuiBadge>,
      fields,
    }}
  />
);

interface RuleInstallMessageProps {
  date: React.ReactNode;
  username: string;
  version: number;
}

export const RULE_INSTALL_MESSAGE = ({
  date,
  username,
  version,
}: RuleInstallMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleInstallMessage"
    defaultMessage="On {date} {username} installed {actionLabel} {version} of the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      actionLabel: <strong>{ELASTIC_VERSION_ACTION_LABEL}</strong>,
      version: <EuiBadge>{version}</EuiBadge>,
    }}
  />
);

interface SimpleActionMessageProps {
  date: React.ReactNode;
  username: string;
}

export const RULE_CREATED_MESSAGE = ({ date, username }: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleCreatedMessage"
    defaultMessage="On {date} {username} created the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_ENABLED_MESSAGE = ({ date, username }: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleEnabledMessage"
    defaultMessage="On {date} {username} enabled the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_DISABLED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleDisabledMessage"
    defaultMessage="On {date} {username} disabled the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_SNOOZED_MESSAGE = ({ date, username }: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleSnoozedMessage"
    defaultMessage="On {date} {username} snoozed the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_UNSNOOZED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleUnsnoozedMessage"
    defaultMessage="On {date} {username} unsnoozed the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_API_KEY_UPDATED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleApiKeyUpdatedMessage"
    defaultMessage="On {date} {username} updated the API key of the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_DELETED_MESSAGE = ({ date, username }: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleDeletedMessage"
    defaultMessage="On {date} {username} deleted the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_DUPLICATED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleDuplicatedMessage"
    defaultMessage="On {date} {username} duplicated the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_IMPORTED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleImportedMessage"
    defaultMessage="On {date} {username} imported the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

export const RULE_REVERTED_MESSAGE = ({
  date,
  username,
}: SimpleActionMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleRevertedMessage"
    defaultMessage="On {date} {username} reverted the rule to a previous version"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
    }}
  />
);

interface RuleGenericChangeMessageProps {
  date: React.ReactNode;
  username: string;
  action: string;
}

export const RULE_GENERIC_CHANGE_MESSAGE = ({
  date,
  username,
  action,
}: RuleGenericChangeMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleGenericChangeMessage"
    defaultMessage="On {date} {username} {action} the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      action: <strong>{action}</strong>,
    }}
  />
);
