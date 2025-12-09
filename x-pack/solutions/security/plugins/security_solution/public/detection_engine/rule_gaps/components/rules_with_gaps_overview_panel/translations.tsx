/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_GAPS_OVERVIEW_PANEL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleGaps.overviewPanel.label',
  {
    defaultMessage: 'Rules with gaps',
  }
);

export const RULE_GAPS_OVERVIEW_PANEL_TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleGaps.overviewPanel.tooltip',
  {
    defaultMessage: 'Total rules with gaps / rules that currently have in-progress gaps',
  }
);
