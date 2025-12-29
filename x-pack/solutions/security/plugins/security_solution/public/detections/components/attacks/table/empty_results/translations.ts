/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.learnMoreLink',
  {
    defaultMessage: 'Learn more',
  }
);

export const NO_SCHEDULES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.noSchedulesTitle',
  {
    defaultMessage: 'Automate attack discoveries for your alerts',
  }
);

export const NO_SCHEDULES_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.noSchedulesBody',
  {
    defaultMessage: 'Schedule recurring scans to find attacks without manual effort.',
  }
);

export const NO_SCHEDULES_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.noSchedulesAction',
  {
    defaultMessage: 'Schedule',
  }
);

export const RESET_FILTERS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.resetFiltersTitle',
  {
    defaultMessage: 'No attacks match your search criteria',
  }
);

export const RESET_FILTERS_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.resetFiltersBody',
  {
    defaultMessage: 'Adjust your filters, change the time range, or',
  }
);

export const RESET_FILTERS_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.resetFiltersAction',
  {
    defaultMessage: 'Clear all filters',
  }
);

export const WITH_SCHEDULES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.withSchedulesTitle',
  {
    defaultMessage: 'No attacks detected for selected time',
  }
);

export const WITH_SCHEDULES_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.withSchedulesBody',
  {
    defaultMessage: 'Scheduled runs happen automatically.',
  }
);

export const WITH_SCHEDULES_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.emptyResults.withSchedulesAction',
  {
    defaultMessage: 'View schedules',
  }
);
