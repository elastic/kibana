/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityCentricExperience } from '@kbn/observability-plugin/common';
import { useKibanaContextForPlugin } from './use_kibana';

export function useEntityCentricExperienceSetting() {
  const { uiSettings } = useKibanaContextForPlugin().services;

  const isEntityCentricExperienceEnabled = uiSettings.get<boolean>(entityCentricExperience, true);

  return { isEntityCentricExperienceEnabled };
}
