/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.monitoring.emptyPage.title',
  {
    defaultMessage: 'No action-triggered runs',
  }
);

export const EMPTY_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.monitoring.emptyPage.description',
  {
    defaultMessage:
      'Action-triggered runs are generated when detection rules trigger the Attack Discovery action. Configure a detection rule action to see results here.',
  }
);
