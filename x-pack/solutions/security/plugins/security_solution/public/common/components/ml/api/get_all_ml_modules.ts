/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Module } from '../../ml_popover/types';
import { KibanaServices } from '../../../lib/kibana';

export const GET_ALL_ML_MODULES_ROUTE = '/internal/ml/modules/get_module/';
export interface GetAllMlModulesArgs {
  signal?: AbortSignal;
}

export const getAllMlModules = async ({ signal }: GetAllMlModulesArgs): Promise<Module[]> =>
  KibanaServices.get().http.fetch<Module[]>(GET_ALL_ML_MODULES_ROUTE, {
    method: 'GET',
    version: '1',
    asSystemRequest: true,
    signal,
  });
