/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { useActiveKibanaSpace } from './use_kibana_space';

export const NEW_INFRASTRUCTURE_EXPERIENCE_STORAGE_KEY = 'newInfrastructureExperience';

export function useNewInfrastructureExperience() {
  const { space } = useActiveKibanaSpace();
  const spaceId = space?.id ?? DEFAULT_SPACE_ID;
  return useLocalStorage(`${NEW_INFRASTRUCTURE_EXPERIENCE_STORAGE_KEY}:${spaceId}`, false);
}
