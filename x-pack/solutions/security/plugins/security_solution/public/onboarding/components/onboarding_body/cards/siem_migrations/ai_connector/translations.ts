/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_CONNECTOR_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnectorService.title',
  {
    defaultMessage: 'Configure AI service',
  }
);

export const AI_CONNECTOR_CARD_DESCRIPTION_START = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnector.descriptionStartService',
  { defaultMessage: 'This feature relies on an AI service for rule translation. ' }
);

export const AI_CONNECTOR_CARD_DESCRIPTION_INFERENCE_CONNECTOR = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnector.descriptionInferenceConnectorService',
  {
    defaultMessage:
      'The Elastic-provided service is selected by default. You can configure another service and model if you prefer. ',
  }
);

export const LLM_MATRIX_LINK = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnector.llmMatrixLink',
  { defaultMessage: 'model performance' }
);

export const AI_POWERED_MIGRATIONS_LINK = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnector.automaticMigrationLink',
  { defaultMessage: 'AI-powered Automatic migration' }
);

export const LEARN_MORE_LINK = i18n.translate(
  'xpack.securitySolution.onboarding.aiConnector.learnMoreLink',
  { defaultMessage: 'Learn more' }
);
