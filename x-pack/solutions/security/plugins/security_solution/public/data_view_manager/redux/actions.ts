/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';

import type { DataViewManagerScopeName } from '../constants';
import { SLICE_PREFIX } from '../constants';

export const selectDataViewAsync = createAction<{
  id?: string | null;
  /**
   * Fallback patterns are used when the specific data view ID is undefined. This flow results in an ad-hoc data view creation
   */
  fallbackPatterns?: string[];
  /**
   * Specify one or more security solution scopes where the data view selection should be applied
   */
  scope: DataViewManagerScopeName[];
}>(`${SLICE_PREFIX}/selectDataView`);
