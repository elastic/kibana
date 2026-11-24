/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import { getSLOGlobalSettingsResponseSchema } from '@kbn/slo-schema';
import type { SLOGlobalSettings, SliRetention } from '../../domain/models';
import { DEFAULT_SLI_RETENTION, getEffectiveSliRetention } from './get_effective_sli_retention';

interface Params {
  stored: SLOGlobalSettings;
  override?: SliRetention;
}

/** Returns the stored global SLO settings (or their defaults) with the effective settings. */
export const toGlobalSettingsResponse = ({
  stored,
  override,
}: Params): GetSLOGlobalSettingsResponse => {
  const { sliRetention } = stored;
  const { enabled, periodDays } = sliRetention ?? DEFAULT_SLI_RETENTION;

  return getSLOGlobalSettingsResponseSchema.encode({
    sliRetention: {
      enabled,
      periodDays,
      updatedAt: sliRetention?.updatedAt ?? null,
      effective: getEffectiveSliRetention({ stored: sliRetention, override }),
    },
  });
};
