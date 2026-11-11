/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDetectionEngineServiceAccount } from './use_detection_engine_service_account';

/**
 * Whether the current user can switch the space's detection engine back on. Resume and Reset
 * bring the workflows bound to the detection engine account back, which needs `manage_security`
 * once the space is set up; Pause only turns them off, so it needs no such check. Reads as
 * allowed until the status loads: the server enforces the same rule.
 */
export const useCanRestoreDetectionEngine = (): boolean => {
  const { data } = useDetectionEngineServiceAccount();
  return data?.serviceAccountId == null || data.canSetUp;
};
