/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_ALERT_DATA_VIEW = {
  id: 'security_solution_alerts_dv',
  name: 'Security Solution Alerts DataView',
};

// Runtime field to extract the related_integration.package value from the kibana.alert.rule.parameters field
// This is used in the AI4DSOC alert summary page
export const RELATED_INTEGRATION = 'relatedIntegration';
