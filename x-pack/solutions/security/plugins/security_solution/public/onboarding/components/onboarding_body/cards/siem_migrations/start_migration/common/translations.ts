/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const START_MIGRATION_CARD_CONNECTOR_MISSING_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.common.startMigration.connectorMissingText',
  {
    defaultMessage:
      'You need an LLM connector to power SIEM rule migration. Set one up or choose an existing one to get started.',
  }
);
export const START_MIGRATION_CARD_CONNECTOR_MISSING_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.common.startMigration.connectorMissingButton',
  { defaultMessage: 'Set up AI Connector' }
);
