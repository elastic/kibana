/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: document this file, maybe rename?
export interface DetectionRulesAuthz {
  canReadRules: boolean;
  canEditRules: boolean;
  canReadExceptions: boolean;
  canEditExceptions: boolean;
  canEnableDisableRules: boolean;
  canEditCustomHighlightedFields: boolean;
  canEditInvestigationGuides: boolean;
}
