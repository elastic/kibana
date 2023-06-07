/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { v1 as uuidv1 } from 'uuid';
import { CreateCompositeSLOInput } from '@kbn/slo-schema';

const defaultCompositeSLOInput: CreateCompositeSLOInput = {
  name: 'some composite slo',
  timeWindow: {
    duration: '7d',
    type: 'rolling',
  },
  budgetingMethod: 'occurrences',
  objective: {
    target: 0.95,
  },
  compositeMethod: 'weightedAverage',
  sources: [
    { id: uuidv1(), revision: 1, weight: 1 },
    { id: uuidv1(), revision: 2, weight: 2 },
  ],
  tags: ['critical', 'k8s'],
};

export function createCompositeSLOInput(
  data: Partial<CreateCompositeSLOInput> = {}
): CreateCompositeSLOInput {
  return cloneDeep({ ...defaultCompositeSLOInput, ...data });
}
