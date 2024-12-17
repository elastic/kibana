/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_MATCH_QUERY_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchQueryBar.requiredError',
  {
    defaultMessage: 'An indicator index query is required.',
  }
);
