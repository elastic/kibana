/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';

export const CHANGE_DETAILS_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changeDetailsFlyoutTitle',
  {
    defaultMessage: 'Change details',
  }
);

export const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.closeButtonLabel',
  {
    defaultMessage: 'Close',
  }
);

export const CHANGE_DETAILS_TAB_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.changeDetailsTabTitle',
  {
    defaultMessage: 'Change details',
  }
);

export const OVERVIEW_AT_SAVE_TAB_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewAtSaveTabTitle',
  {
    defaultMessage: 'Overview at save',
  }
);

export const OVERVIEW_ABOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewAboutTitle',
  {
    defaultMessage: 'About',
  }
);

export const OVERVIEW_DEFINITION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.overviewDefinitionTitle',
  {
    defaultMessage: 'Definition',
  }
);

export const REVISION_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.revisionBadgeLabel',
  {
    defaultMessage: 'Revision',
  }
);

export const VERSION_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.versionBadgeLabel',
  {
    defaultMessage: 'Version',
  }
);

export const SYSTEM_USER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.systemUserLabel',
  {
    defaultMessage: 'System',
  }
);

export const ACTION_RULE_CREATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleCreate',
  { defaultMessage: 'created' }
);

export const ACTION_RULE_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleUpdate',
  { defaultMessage: 'updated' }
);

export const ACTION_RULE_ENABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleEnable',
  { defaultMessage: 'enabled' }
);

export const ACTION_RULE_DISABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleDisable',
  { defaultMessage: 'disabled' }
);

export const ACTION_RULE_SNOOZE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleSnooze',
  { defaultMessage: 'snoozed' }
);

export const ACTION_RULE_UNSNOOZE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleUnsnooze',
  { defaultMessage: 'unsnoozed' }
);

export const ACTION_RULE_BULK_EDIT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleBulkEdit',
  { defaultMessage: 'bulk-edited' }
);

export const ACTION_RULE_API_KEY_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.actions.ruleApiKeyUpdate',
  { defaultMessage: 'updated API key of' }
);

interface ViewRevisionProps {
  revision: number;
}

export const VIEW_REVISION = ({ revision }: ViewRevisionProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.viewRevision"
    defaultMessage="{header} {revision}"
    values={{
      header: <strong>{`${REVISION_HEADER}:`}</strong>,
      revision: <EuiBadge>{revision}</EuiBadge>,
    }}
  />
);

interface ComparedRevisionsProps {
  revisionBefore: number;
  revisionAfter: number;
}

export const COMPARED_REVISIONS = ({
  revisionBefore,
  revisionAfter,
}: ComparedRevisionsProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.comparedRevisions"
    defaultMessage="{comparing} Revisions {revisionBefore} -> {revisionAfter}"
    values={{
      comparing: <strong>{`${COMPARED_REVISIONS_HEADER}:`}</strong>,
      revisionBefore: <EuiBadge>{revisionBefore}</EuiBadge>,
      revisionAfter: <EuiBadge>{revisionAfter}</EuiBadge>,
    }}
  />
);

interface UpdatedByProps {
  action: string;
  username: string;
  timestamp: string;
}

export const UPDATED_BY = ({ action, username, timestamp }: UpdatedByProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.updatedBy"
    defaultMessage="{action} {username} on {timestamp}"
    values={{
      action: <strong>{`${action[0].toUpperCase()}${action.slice(1)} by:`}</strong>,
      username: <EuiBadge>{username}</EuiBadge>,
      timestamp: <PreferenceFormattedDate value={new Date(timestamp)} />,
    }}
  />
);

interface FieldChangesProps {
  fields: string[];
}

export const FIELD_CHANGES = ({ fields }: FieldChangesProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.fieldChanges"
    defaultMessage="{fieldChanges} {fields}"
    values={{
      fieldChanges: <strong>{`${FIELD_CHANGES_HEADER}:`}</strong>,
      fields: fields.map((field) => <EuiBadge key={field}>{field}</EuiBadge>),
    }}
  />
);

const REVISION_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.revisionHeader',
  { defaultMessage: 'Revision' }
);

const COMPARED_REVISIONS_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.comparingRevisionsHeader',
  { defaultMessage: 'Comparing' }
);

const FIELD_CHANGES_HEADER = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.header.fieldChangesHeader',
  { defaultMessage: 'Field changes' }
);

export const NO_VISIBLE_CHANGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.noVisibleChanges',
  { defaultMessage: 'No visible field changes for this revision.' }
);
