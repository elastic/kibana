/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { registerInstall } from './install';
export { registerStop } from './stop';
export { registerStatus } from './status';
export { registerForceLogExtraction } from './force_log_extraction';
export { registerForceCcsExtractToUpdates } from './force_ccs_extract_to_updates';
export { registerUninstall } from './uninstall';
export { registerCRUDUpsert } from './crud/upsert';
export { registerCRUDUpsertBulk } from './crud/upsert_bulk';
export { registerCRUDDelete } from './crud/delete';
export { registerStart } from './start';
