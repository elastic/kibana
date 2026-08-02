/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The managed-workflow owner id PND registers and installs under, and the `pluginId` every PND
 * managed definition carries.
 *
 * Shared rather than repeated because it is what ties the three together: `reconcilePluginManagedWorkflows`
 * orphan-deletes every `pluginId: 'pnd'` static definition PND did not install during that boot, so
 * the owner PND registers, the owner it installs as, and the `pluginId` the install-parity guard in
 * `install_static.test.ts` filters the registry by must be the same string.
 */
export const PND_MANAGED_WORKFLOW_OWNER_ID = 'pnd';
