/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '@kbn/core/server';
import { FixturePlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new FixturePlugin(initializerContext);

export const INTERNAL_USER_PROFILES_BULK_GET = '/internal/sec_fixture/user_profiles/_bulk_get';

export const UserProfilesBulkGetSchema = schema.object({
  uids: schema.arrayOf(schema.string()),
  dataPath: schema.string(),
});

export type UserProfilesBulkGetParams = TypeOf<typeof UserProfilesBulkGetSchema>;
