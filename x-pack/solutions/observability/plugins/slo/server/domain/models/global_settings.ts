/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  sliRetentionSchema,
  sloGlobalSettingsSchema,
  sloGlobalSettingsUpdateSchema,
} from '@kbn/slo-schema';

type SliRetention = z.output<typeof sliRetentionSchema>;
type SLOGlobalSettings = z.output<typeof sloGlobalSettingsSchema>;
type StoredSLOGlobalSettings = z.input<typeof sloGlobalSettingsSchema>;
type SLOGlobalSettingsUpdate = z.output<typeof sloGlobalSettingsUpdateSchema>;

type EffectiveSettingSource = 'default' | 'settings' | 'config';

interface EffectiveSliRetention extends SliRetention {
  readonly source: EffectiveSettingSource;
}

export type {
  SliRetention,
  SLOGlobalSettings,
  StoredSLOGlobalSettings,
  SLOGlobalSettingsUpdate,
  EffectiveSettingSource,
  EffectiveSliRetention,
};
