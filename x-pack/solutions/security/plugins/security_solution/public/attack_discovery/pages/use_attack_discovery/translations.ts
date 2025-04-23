/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GENERATION_STARTED_TEXT = (connectorName?: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.useAttackDiscovery.generationStartedToastText',
    {
      defaultMessage:
        'Attack discovery generation started {connectorName, select, undefined {} other { via {connectorName}}}',
      values: { connectorName },
    }
  );

export const GENERATION_STARTED_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.useAttackDiscovery.generationStartedToastTitle',
  {
    defaultMessage: 'Generation started',
  }
);
