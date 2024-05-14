/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';

const deleteAllAlertingSO = async ({ kbnServer }: { kbnServer: KbnClient }) => {
  await kbnServer.savedObjects.clean({
    types: [
      'alert',
      'ad_hoc_run_params',
      'api_key_pending_invalidation',
      'rules-settings',
      'maintenance-window',
    ],
  });
};

const deleteAllActionSO = async ({ kbnServer }: { kbnServer: KbnClient }) => {
  await kbnServer.savedObjects.clean({
    types: ['action', 'action_task_params', 'connector_token'],
  });
};

export const deleteAllAlertingData = async ({ kbnServer }: { kbnServer: KbnClient }) => {
  await deleteAllAlertingSO({ kbnServer });
  await deleteAllActionSO({ kbnServer });
};
