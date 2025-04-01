/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

export const coverageOverviewPanelWidth = 160;

export const coverageOverviewLegendWidth = 380;

export const coverageOverviewFilterWidth = 300;

export const ruleActivityFilterDefaultOptions = [
  {
    label: CoverageOverviewRuleActivity.Enabled,
  },
  {
    label: CoverageOverviewRuleActivity.Disabled,
  },
];

export const ruleActivityFilterLabelMap: Record<string, string> = {
  [CoverageOverviewRuleActivity.Enabled]: i18n.CoverageOverviewEnabledRuleActivity,
  [CoverageOverviewRuleActivity.Disabled]: i18n.CoverageOverviewDisabledRuleActivity,
};

export const ruleSourceFilterDefaultOptions = [
  {
    label: CoverageOverviewRuleSource.Prebuilt,
  },
  {
    label: CoverageOverviewRuleSource.Custom,
  },
];

export const ruleSourceFilterLabelMap: Record<string, string> = {
  [CoverageOverviewRuleSource.Prebuilt]: i18n.CoverageOverviewElasticRuleSource,
  [CoverageOverviewRuleSource.Custom]: i18n.CoverageOverviewCustomRuleSource,
};
