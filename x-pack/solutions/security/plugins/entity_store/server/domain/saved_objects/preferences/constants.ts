/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const DEFAULT_AUTO_INSTALL = true;

export type EntityStorePreferences = z.infer<typeof EntityStorePreferences>;
export const EntityStorePreferences = z.object({
  // Whether the store auto-installs on Security Solution navigation. Only written `false`
  // (by stop/uninstall); `true` is the default. Survives uninstall in its own saved object.
  autoInstall: z.boolean().default(DEFAULT_AUTO_INSTALL),
});
