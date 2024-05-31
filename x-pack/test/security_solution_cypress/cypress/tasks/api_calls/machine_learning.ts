/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '@kbn/ml-plugin/common/constants/app';
import type { Module } from '@kbn/ml-plugin/common/types/modules';
import { rootRequest } from './common';

export const fetchMachineLearningModules = () => {
  return rootRequest<Module[]>({
    method: 'GET',
    url: `${ML_INTERNAL_BASE_PATH}/modules/get_module`,
    headers: {
      'elastic-api-version': '1',
    },
    failOnStatusCode: false,
  });
};
