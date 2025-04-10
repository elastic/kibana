/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSISTANT_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.title',
  {
    defaultMessage: 'Configure AI Assistant',
  }
);

export const ASSISTANT_CARD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.description',
  {
    defaultMessage:
      'Choose and configure any AI provider available to use with Elastic AI Assistant.',
  }
);

export const ASSISTANT_CARD_CALLOUT_INTEGRATIONS_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.calloutIntegrationsText',
  {
    defaultMessage: 'To add Elastic rules add integrations first.',
  }
);

export const ASSISTANT_CARD_CALLOUT_INTEGRATIONS_BUTTON = i18n.translate(
  'xpack.securitySolution.onboarding.assistantCard.calloutIntegrationsButton',
  {
    defaultMessage: 'Add integrations step',
  }
);
