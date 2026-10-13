/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { consumeRunQuota } from './consume';
export { assertCanManageRunQuotas, canManageRunQuotas } from './privileges';
export {
  createRunQuotaInternalRepository,
  patchRunQuotaSettings,
  readRunQuotaLedger,
  readRunQuotaSettings,
} from './repository';
export type { RunQuotaSavedObjectsRepository, RunQuotaSettingsPatch } from './repository';
export {
  runQuotaLedgerSavedObjectType,
  runQuotaSettingsSavedObjectType,
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
} from './saved_objects';
export type { RunQuotaLedgerAttributes, RunQuotaSettingsAttributes } from './saved_objects';
export { dayKey, resolveDailyWindow } from './window';
