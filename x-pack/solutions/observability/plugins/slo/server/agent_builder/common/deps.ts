/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { GetScopedClients } from '../../lib/get_scoped_clients';

export interface SloToolDeps {
  getScopedClients: GetScopedClients;
  getLicensing: () => Promise<LicensingPluginStart>;
  config: { isServerless: boolean; getIsCpsEnabled: () => boolean };
  logger: Logger;
}
