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

interface ShownEventsVsTotal {
  /**
   * 1-based page number
   */
  page: number;
  perPage: number;
  total: number;
}

export const SHOWN_EVENTS_VS_TOTAL = ({
  page,
  perPage,
  total,
}: ShownEventsVsTotal): JSX.Element => {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.totalEvents"
      defaultMessage="Showing {range} of {total} {totalNum, plural, one {change} other {changes}}"
      values={{
        range: (
          <strong>
            {start}-{end}
          </strong>
        ),
        total: <strong>{total}</strong>,
        totalNum: total,
      }}
    />
  );
};

export const TIMELINE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.timelineAriaLabel',
  {
    defaultMessage: 'Rule change history timeline',
  }
);

export const PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.paginationAriaLabel',
  {
    defaultMessage: 'Rule change history pagination',
  }
);

export const TRACKING_STARTED_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.trackingStartedLabel',
  {
    defaultMessage: 'Rule change tracking started',
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

interface RuleChangeMessageProps {
  date: React.ReactNode;
  username: string;
  action: string;
}

export const RULE_CHANGE_MESSAGE = ({
  date,
  username,
  action,
}: RuleChangeMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleChangeMessage"
    defaultMessage="On {date} {username} {action} the rule"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      action: <strong>{action}</strong>,
    }}
  />
);

interface RuleUpdateMessageProps {
  date: React.ReactNode;
  username: string;
  revision: number;
  fields: string[];
}

export const RULE_UPDATE_MESSAGE = ({
  date,
  username,
  revision,
  fields,
}: RuleUpdateMessageProps): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.ruleDetails.ruleChangeHistory.ruleUpdateMessage"
    defaultMessage="On {date} {username} made revision {revision} changing {fields}"
    values={{
      date,
      username: <EuiBadge color="hollow">{username}</EuiBadge>,
      revision: <EuiBadge>{revision}</EuiBadge>,
      fields: fields.map((field) => <EuiBadge>{field}</EuiBadge>),
    }}
  />
);
