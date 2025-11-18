/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const RISK_INPUTS_BUTTON = getDataTestSubjectSelector('riskInputsTitleLink');
export const RISK_INPUT_PANEL_HEADER = getDataTestSubjectSelector(
  'securitySolutionFlyoutRiskInputsTab'
);

export const ASSET_CRITICALITY_BADGE = getDataTestSubjectSelector(
  'risk-inputs-asset-criticality-badge'
);
