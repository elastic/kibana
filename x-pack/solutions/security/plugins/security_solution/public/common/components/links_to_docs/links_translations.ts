/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * If a link's text is "Docs", its aria-label will be set to
 * "Docs - ${COMMON_ARIA_LABEL_ENDING}".
 */
export const COMMON_ARIA_LABEL_ENDING = i18n.translate(
  'xpack.securitySolution.documentationLinks.ariaLabelEnding',
  {
    defaultMessage: 'click to open documentation in a new tab',
  }
);

export const SOLUTION_REQUIREMENTS_LINK_PATH = 'sec-requirements.html';
export const SOLUTION_REQUIREMENTS_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.documentationLinks.solutionRequirements.text',
  {
    defaultMessage: 'Elastic Security system requirements',
  }
);

export const DETECTIONS_REQUIREMENTS_LINK_PATH = 'detections-permissions-section.html';
export const DETECTIONS_REQUIREMENTS_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.documentationLinks.detectionsRequirements.text',
  {
    defaultMessage: 'Detections prerequisites and requirements',
  }
);

export const ML_JOB_COMPATIBILITY_LINK_PATH = 'alerts-ui-monitor.html#ml-job-compatibility';
export const ML_JOB_COMPATIBILITY_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.documentationLinks.mlJobCompatibility.text',
  {
    defaultMessage: 'ML job compatibility',
  }
);

export const COVERAGE_OVERVIEW_LINK_PATH = 'rules-coverage.html';
export const COVERAGE_OVERVIEW_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.documentationLinks.coverageOverview.text',
  {
    defaultMessage: 'Learn more.',
  }
);
