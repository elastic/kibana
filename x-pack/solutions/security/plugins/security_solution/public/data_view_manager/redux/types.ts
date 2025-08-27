/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';

export interface ScopedDataViewSelectionState {
  dataViewId: string | null;
  /**
   * There are several states the picker can be in internally:
   * - pristine - not initialized yet
   * - loading - the dataView instance is loading with all associated fields, runtime fields, etc...
   * - error - some kind of a problem during data init
   * - ready - ready to provide index information to the client
   */
  status: 'pristine' | 'loading' | 'error' | 'ready';
}

export interface SharedDataViewSelectionState {
  dataViews: DataViewSpec[];
  adhocDataViews: DataViewSpec[];
  status: 'pristine' | 'loading' | 'error' | 'ready';
  defaultDataViewId: string | null;
  alertDataViewId: string | null;
  signalIndex: SignalIndexMetadata | null;
}

export interface SignalIndexMetadata {
  name: string;
  isOutdated: boolean;
}

export { type DataViewSpec };
