/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

import type { PageScope } from '../../data_view_manager/constants';
import type { SelectedDataView, SourcererDataView } from './model';
import type { SecurityDataView } from '../containers/create_sourcerer_data_view';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/sourcerer');

export const setDataView = actionCreator<Partial<SourcererDataView>>('SET_DATA_VIEW');

export const setDataViewLoading = actionCreator<{
  id: string;
  loading: boolean;
}>('SET_DATA_VIEW_LOADING');

export const setSourcererDataViews = actionCreator<SecurityDataView>('SET_SOURCERER_DATA_VIEWS');

export interface SelectedDataViewPayload {
  id: PageScope;
  selectedDataViewId: SelectedDataView['dataViewId'];
  selectedPatterns: SelectedDataView['selectedPatterns'];
  shouldValidateSelectedPatterns?: boolean;
}
export const setSelectedDataView = actionCreator<SelectedDataViewPayload>('SET_SELECTED_DATA_VIEW');
