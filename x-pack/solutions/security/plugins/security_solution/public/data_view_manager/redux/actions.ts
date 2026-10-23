/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-toolkit-v1';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';

import type { PageScope } from '../constants';
import { SLICE_PREFIX } from '../constants';

/**
 * Time field of an ad-hoc data view, along with any runtime fields it depends on.
 */
export interface TimeFieldSpec {
  timeFieldName: string;
  runtimeFieldMap?: DataViewSpec['runtimeFieldMap'];
}

export interface SelectDataViewAsyncPayload {
  id?: string | null;
  /**
   * Fallback patterns are used when the specific data view ID is undefined. This flow results in an ad-hoc data view creation
   */
  fallbackPatterns?: string[];
  /**
   * Time field for the ad-hoc data view created from `fallbackPatterns`. Defaults to no time field.
   */
  fallbackTimeFieldSpec?: TimeFieldSpec;
  /**
   * Specify one or more security solution scopes where the data view selection should be applied
   */
  scope: PageScope;
}

// NOTE: You should not need to dispatch any actions by yourself. Instead, use one of the hooks that we built to faciliate data view selection and retrieval based on current scope.

export const selectDataViewAsync = createAction<SelectDataViewAsyncPayload>(
  `${SLICE_PREFIX}/selectDataView`
);
