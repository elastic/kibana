/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { IdToDataProvider } from './model';
import type { State } from '../types';

const selectDataProviders = (state: State): IdToDataProvider => state.dragAndDrop.dataProviders;

export const getDataProvidersSelector = () =>
  createSelector(selectDataProviders, (dataProviders) => dataProviders);
