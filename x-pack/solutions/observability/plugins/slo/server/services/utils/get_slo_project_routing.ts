/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEsProjectRouting } from '../../../common/project_routings';
import type { SLODefinition } from '../../domain/models';

export const getSloProjectRouting = (
  slo: SLODefinition,
  {
    isServerless,
    isCpsAvailable,
  }: {
    isServerless: boolean;
    isCpsAvailable: boolean;
  }
): string | undefined => {
  if (!isServerless || !isCpsAvailable) {
    return undefined;
  }

  return toEsProjectRouting(slo.settings.projectRoutings, slo.settings.preventCrossProjectSearch);
};
