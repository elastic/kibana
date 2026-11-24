/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PutSLOGlobalSettingsParams, PutSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import type { SliRetention } from '../../domain/models';
import { IllegalArgumentError } from '../../errors';
import type { SLOGlobalSettingsRepository } from './slo_global_settings_repository';
import { toGlobalSettingsResponse } from './to_global_settings_response';

interface Params {
  repository: SLOGlobalSettingsRepository;
  override?: SliRetention;
  settings: PutSLOGlobalSettingsParams;
}

/** Saves the global SLO settings, unless SLI retention is overridden in kibana.yml. */
export const updateGlobalSettings = async ({
  repository,
  override,
  settings,
}: Params): Promise<PutSLOGlobalSettingsResponse> => {
  if (override) {
    throw new IllegalArgumentError(
      'SLI retention is set by xpack.slo.sliRetention in kibana.yml and cannot be changed through the API'
    );
  }

  const stored = await repository.save(settings);

  return toGlobalSettingsResponse({ stored });
};
