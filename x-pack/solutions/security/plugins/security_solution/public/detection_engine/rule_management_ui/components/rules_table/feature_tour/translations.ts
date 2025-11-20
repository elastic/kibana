/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PREVIOUS_STEP_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.previousStepLabel',
  {
    defaultMessage: 'Go to previous step',
  }
);

export const NEXT_STEP_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allRules.featureTour.nextStepLabel',
  {
    defaultMessage: 'Go to next step',
  }
);

export const IM_DOES_NOT_MATCH_TOUR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.imDoesNotMatchTourTitle',
  {
    defaultMessage: 'New indicator match rule capabilities',
  }
);

export const IM_DOES_NOT_MATCH_TOUR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.imDoesNotMatchTourDescription',
  {
    defaultMessage:
      "Now you can refine your indicator match logic to ignore event values that don't match indicator values.",
  }
);
