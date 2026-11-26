/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PutSLOGlobalSettingsParams, PutSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import type { SliRetention } from '../../domain/models';
import type { SLOGlobalSettingsRepository } from './slo_global_settings_repository';
import { toGlobalSettingsResponse } from './to_global_settings_response';

interface Params {
  repository: SLOGlobalSettingsRepository;
  override?: SliRetention;
  settings: PutSLOGlobalSettingsParams;
}

/** Saves the global SLO settings; a kibana.yml override keeps precedence over the saved value. */
export const updateGlobalSettings = async ({
  repository,
  override,
  settings,
}: Params): Promise<PutSLOGlobalSettingsResponse> => {
  const stored = await repository.save(settings);

  return toGlobalSettingsResponse({ stored, override });
};
