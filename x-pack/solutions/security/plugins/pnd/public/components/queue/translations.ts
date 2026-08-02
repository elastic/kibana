/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { QueueGroupMode } from './types';

export const riskScoreAriaLabel = (score: number): string =>
  i18n.translate('xpack.pnd.queue.riskScoreAriaLabel', {
    defaultMessage: 'Risk score {score}',
    values: { score },
  });

export const rowAriaLabel = ({ caseId, title }: { caseId: string; title: string }): string =>
  i18n.translate('xpack.pnd.queue.rowAriaLabel', {
    defaultMessage: '{title}, {caseId}',
    values: { caseId, title },
  });

export const rowAriaLabelWithScore = ({
  caseId,
  riskScore,
  title,
}: {
  caseId: string;
  riskScore: number;
  title: string;
}): string =>
  i18n.translate('xpack.pnd.queue.rowAriaLabelWithScore', {
    defaultMessage: '{title}, {caseId}, risk score {riskScore}',
    values: { caseId, riskScore, title },
  });

export const primaryActionAriaLabel = ({
  label,
  title,
}: {
  label: string;
  title: string;
}): string =>
  i18n.translate('xpack.pnd.queue.primaryActionAriaLabel', {
    defaultMessage: '{label} for {title}',
    values: { label, title },
  });

export const OPEN_IN_CHAT = i18n.translate('xpack.pnd.queue.openInChatTooltip', {
  defaultMessage: 'Open in chat',
});

export const openInChatAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.queue.openInChatAriaLabel', {
    defaultMessage: 'Open {title} in chat',
    values: { title },
  });

export const MORE_ACTIONS = i18n.translate('xpack.pnd.queue.moreActionsTooltip', {
  defaultMessage: 'More actions',
});

export const moreActionsAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.queue.moreActionsAriaLabel', {
    defaultMessage: 'More actions for {title}',
    values: { title },
  });

export const VIEW_LIFECYCLE = i18n.translate('xpack.pnd.queue.viewLifecycleButtonLabel', {
  defaultMessage: 'View lifecycle',
});

export const WAITING_FOR_INPUT = i18n.translate('xpack.pnd.queue.waitingForInputBadge', {
  defaultMessage: 'Waiting for input',
});

export const INVESTIGATING = i18n.translate('xpack.pnd.queue.investigatingBadge', {
  defaultMessage: 'Investigating',
});

export const openParentAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.queue.openParentAriaLabel', {
    defaultMessage: 'Open parent: {title}',
    values: { title },
  });

export const showMoreButtonLabel = (count: number): string =>
  i18n.translate('xpack.pnd.queue.showMoreButtonLabel', {
    defaultMessage: '+{count} more',
    values: { count },
  });

export const typeSectionAriaLabel = ({ count, label }: { count: number; label: string }): string =>
  i18n.translate('xpack.pnd.queue.typeSectionAriaLabel', {
    defaultMessage: '{label}, {count, plural, one {# action} other {# actions}} waiting',
    values: { count, label },
  });

export const GROUP_BY = i18n.translate('xpack.pnd.queue.groupByLabel', {
  defaultMessage: 'Group by:',
});

export const GROUP_MODE_LABELS: Readonly<Record<QueueGroupMode, string>> = {
  thread: i18n.translate('xpack.pnd.queue.groupModeThreadDropDownOptionLabel', {
    defaultMessage: 'Thread',
  }),
  type: i18n.translate('xpack.pnd.queue.groupModeTypeDropDownOptionLabel', {
    defaultMessage: 'Type',
  }),
  'type-thread': i18n.translate('xpack.pnd.queue.groupModeTypeThreadDropDownOptionLabel', {
    defaultMessage: 'Type + thread context',
  }),
};

export const groupControlAriaLabel = (modeLabel: string): string =>
  i18n.translate('xpack.pnd.queue.groupControlAriaLabel', {
    defaultMessage: 'Group the queue by {modeLabel}',
    values: { modeLabel },
  });
