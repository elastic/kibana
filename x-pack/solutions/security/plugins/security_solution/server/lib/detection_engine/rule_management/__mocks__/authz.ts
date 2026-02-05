/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionRulesAuthz } from '../../../../../common/detection_engine/rule_management/authz';

export const getMockRulesAuthz = (): DetectionRulesAuthz => ({
  canReadRules: true,
  canEditRules: true,
  canReadExceptions: true,
  canEditExceptions: true,
  canEnableDisableRules: true,
  canEditCustomHighlightedFields: true,
  canEditInvestigationGuides: true,
});
