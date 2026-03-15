/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isIdBasedRiskScoringEnabled = ({
  entityStoreV2Enabled,
  idBasedRiskScoringEnabled = true,
}: {
  entityStoreV2Enabled: boolean;
  idBasedRiskScoringEnabled?: boolean;
}): boolean => entityStoreV2Enabled && idBasedRiskScoringEnabled;
