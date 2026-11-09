/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Title + description for today's-usage meters (list cell and detail flyout). */
export const getAutomationUsageTooltip = ({
  used,
  limit,
  isGlobalLimitReached = false,
}: {
  used: number;
  limit?: number;
  isGlobalLimitReached?: boolean;
}): { title: string; content: string } => {
  const limitReachedContent = i18n.translate(
    'xpack.nightshift.automations.usageCellLimitReachedTooltip',
    { defaultMessage: 'No more runs until midnight (UTC)' }
  );

  if (isGlobalLimitReached) {
    return {
      title: i18n.translate(
        'xpack.nightshift.automations.usageCellGlobalLimitReachedTooltipTitle',
        { defaultMessage: 'Deployment daily limit reached' }
      ),
      content: limitReachedContent,
    };
  }

  if (limit === undefined) {
    return {
      title: i18n.translate('xpack.nightshift.automations.usageCellNoLimitTooltipTitle', {
        defaultMessage: 'No daily limit',
      }),
      content: i18n.translate('xpack.nightshift.automations.usageCellNoLimitTooltip', {
        defaultMessage: '{used} runs today.',
        values: { used },
      }),
    };
  }

  if (used >= limit) {
    return {
      title: i18n.translate('xpack.nightshift.automations.usageCellLimitReachedTooltipTitle', {
        defaultMessage: 'Daily limit reached',
      }),
      content: limitReachedContent,
    };
  }

  return {
    title: i18n.translate('xpack.nightshift.automations.usageCellTooltipTitle', {
      defaultMessage: '{used} of {limit} triggers used today',
      values: { used, limit },
    }),
    content: i18n.translate('xpack.nightshift.automations.usageCellTooltip', {
      defaultMessage: 'Resets at midnight (UTC)',
    }),
  };
};
