/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MACHINE_LEARNING_JOB_ID_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldMachineLearningJobIdLabel',
  {
    defaultMessage: 'Machine Learning job',
  }
);

export const MACHINE_LEARNING_JOB_ID_EMPTY_FIELD_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningJobIdRequired',
  {
    defaultMessage: 'A Machine Learning job is required.',
  }
);
