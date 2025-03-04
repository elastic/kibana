/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../experimental_features';
import { getAllEntityTypes, getDisabledEntityTypes } from '../utils';
import { EntityType } from '../types';

const ASSET_CRITICALITY_UNAVAILABLE_TYPES = [EntityType.generic];

// TODO delete this function when the universal entity support is added
export const getAssetCriticalityEntityTypes = (experimentalFeatures: ExperimentalFeatures) => {
  const allEntityTypes = getAllEntityTypes();
  const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);

  return allEntityTypes.filter(
    (value) =>
      !disabledEntityTypes.includes(value) && !ASSET_CRITICALITY_UNAVAILABLE_TYPES.includes(value)
  );
};
