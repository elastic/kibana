/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { ServiceLocations, ThrottlingOptions } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '../utils/http_error';

export const getServiceLocations = createAction('[SERVICE LOCATIONS] GET');
export const getServiceLocationsSuccess = createAction<{
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}>('[SERVICE LOCATIONS] GET SUCCESS');
export const getServiceLocationsFailure = createAction<IHttpSerializedFetchError>(
  '[SERVICE LOCATIONS] GET FAILURE'
);
