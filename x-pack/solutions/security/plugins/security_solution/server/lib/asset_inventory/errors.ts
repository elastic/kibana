/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import type { KibanaResponseFactory } from '@kbn/core-http-server';

export const errorInactiveFeature = (response: KibanaResponseFactory) =>
  response.forbidden({
    body: `${SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING} feature must be activated first`,
  });
