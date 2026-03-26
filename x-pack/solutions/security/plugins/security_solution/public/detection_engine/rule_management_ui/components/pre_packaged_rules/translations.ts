/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PRE_BUILT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.emptyPromptTitle',
  {
    defaultMessage: 'Install and enable Elastic prebuilt detection rules',
  }
);

export const PRE_BUILT_MSG = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.prePackagedRules.emptyPromptMessage',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met. To start using them, choose rules to install and enable.',
  }
);

export const ADD_ELASTIC_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.addElasticRulesButtonTitle',
  {
    defaultMessage: 'Add Elastic rules',
  }
);
