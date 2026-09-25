/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import { syntheticsMultiSpaceSettingsSchema } from './zod/settings';

// Multi-space Synthetics settings stored in the `synthetics-settings-multi-space`
// saved object. Today it carries only CCS-related fields; future space-scoped
// settings should be added here.
export { syntheticsMultiSpaceSettingsSchema };

export type SyntheticsMultiSpaceSettings = SchemaOutput<typeof syntheticsMultiSpaceSettingsSchema>;

// API-facing shape that includes the spaces the settings are currently shared with.
// `spaces` is SO envelope metadata, not an attribute, so it lives only on this type.
export interface SyntheticsMultiSpaceSettingsWithSpaces extends SyntheticsMultiSpaceSettings {
  spaces: string[];
}
