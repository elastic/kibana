/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import {
  DynamicSettingsSaveCodec,
  DynamicSettingsCodec,
  LocationMonitorsType,
  DefaultEmailCodec,
} from './zod/dynamic_settings';

export {
  DynamicSettingsSaveCodec,
  DynamicSettingsCodec,
  LocationMonitorsType,
};

export type DynamicSettings = SchemaOutput<typeof DynamicSettingsCodec>;
export type DefaultEmail = SchemaOutput<typeof DefaultEmailCodec>;
export type DynamicSettingsSaveResponse = SchemaOutput<typeof DynamicSettingsSaveCodec>;
export type LocationMonitorsResponse = SchemaOutput<typeof LocationMonitorsType>;
