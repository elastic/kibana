/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLI_RETENTION_DEFAULT_PERIOD_DAYS } from '@kbn/slo-constants';
import type { EffectiveSliRetention, SliRetention } from '../../domain/models';

export const DEFAULT_SLI_RETENTION: Readonly<SliRetention> = {
  enabled: false,
  periodDays: SLI_RETENTION_DEFAULT_PERIOD_DAYS,
};

interface Params {
  stored?: SliRetention;
  override?: SliRetention;
}

/** Returns the effective SLI retention: the config override, else the stored value, else the default. */
export const getEffectiveSliRetention = ({ stored, override }: Params): EffectiveSliRetention => {
  if (override) {
    const { enabled, periodDays } = override;
    return { enabled, periodDays, source: 'config' };
  }
  if (stored) {
    const { enabled, periodDays } = stored;
    return { enabled, periodDays, source: 'settings' };
  }
  return { ...DEFAULT_SLI_RETENTION, source: 'default' };
};
