/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExperimentalFeatures } from '../experimental_features';
import { EntityType } from './types';

export const getAllEntityTypes = (): EntityType[] => Object.values(EntityType);

export const getDisabledEntityTypes = (
  experimentalFeatures: ExperimentalFeatures
): EntityType[] => {
  const disabledEntityTypes: EntityType[] = [];

  return disabledEntityTypes;
};
