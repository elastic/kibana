/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RESPOND_LABEL = i18n.translate('xpack.pnd.proposalStats.respondLabel', {
  defaultMessage: 'Respond',
});

export const INVESTIGATE_LABEL = i18n.translate('xpack.pnd.proposalStats.investigateLabel', {
  defaultMessage: 'Investigate',
});

export const CONFIGURE_LABEL = i18n.translate('xpack.pnd.proposalStats.configureLabel', {
  defaultMessage: 'Configure',
});

export const TWENTY_FOUR_HOURS_AGO = i18n.translate('xpack.pnd.proposalStats.twentyFourHoursAgo', {
  defaultMessage: '24h ago',
});

export const NOW = i18n.translate('xpack.pnd.proposalStats.now', {
  defaultMessage: 'Now',
});

export const CHART_ARIA_LABEL = (label: string, count: number) =>
  i18n.translate('xpack.pnd.proposalStats.chartAriaLabel', {
    defaultMessage: '{label}: {count} open proposals over the last 24 hours',
    values: { label, count },
  });
