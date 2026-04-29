/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

import type { Filter } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { InspectQuery, Refetch, RefetchKql } from './model';
import type { InputsModelId } from './constants';
import type { VisualizationTablesWithMeta } from '../../components/visualization_actions/types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/inputs');

export const setAbsoluteRangeDatePicker = actionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
  fromStr?: string;
  toStr?: string;
}>('SET_ABSOLUTE_RANGE_DATE_PICKER');

export const setTimelineRangeDatePicker = actionCreator<{
  from: string;
  to: string;
}>('SET_TIMELINE_RANGE_DATE_PICKER');

export const setRelativeRangeDatePicker = actionCreator<{
  id: InputsModelId;
  fromStr: string;
  toStr: string;
  from: string;
  to: string;
}>('SET_RELATIVE_RANGE_DATE_PICKER');

export const setDuration = actionCreator<{
  id: InputsModelId;
  duration: number;
}>('SET_DURATION');

export const startAutoReload = actionCreator<{ id: InputsModelId }>('START_KQL_AUTO_RELOAD');

export const stopAutoReload = actionCreator<{ id: InputsModelId }>('STOP_KQL_AUTO_RELOAD');

export const setFullScreen = actionCreator<{
  id: InputsModelId;
  fullScreen: boolean;
}>('SET_FULL_SCREEN');

export const setQuery = actionCreator<{
  inputId: InputsModelId.global | InputsModelId.timeline;
  id: string;
  loading: boolean;
  refetch: Refetch | RefetchKql;
  inspect: InspectQuery | null;
  searchSessionId?: string;
  tables?: VisualizationTablesWithMeta;
}>('SET_QUERY');

export const deleteOneQuery = actionCreator<{
  inputId: InputsModelId.global | InputsModelId.timeline;
  id: string;
}>('DELETE_QUERY');

export const setInspectionParameter = actionCreator<{
  id: string;
  inputId: InputsModelId.global | InputsModelId.timeline;
  isInspected: boolean;
  selectedInspectIndex: number;
  searchSessionId?: string;
}>('SET_INSPECTION_PARAMETER');

export const deleteAllQuery = actionCreator<{ id: InputsModelId }>('DELETE_ALL_QUERY');

export const toggleTimelineLinkTo = actionCreator('TOGGLE_TIMELINE_LINK_TO');

export const removeLinkTo = actionCreator<InputsModelId[]>('REMOVE_LINK_TO');
export const addLinkTo = actionCreator<InputsModelId[]>('ADD_LINK_TO');

export const setFilterQuery = actionCreator<{
  id: InputsModelId;
  query: string | { [key: string]: unknown };
  language: string;
}>('SET_FILTER_QUERY');

export const setSavedQuery = actionCreator<{
  id: InputsModelId;
  savedQuery: SavedQuery | undefined;
}>('SET_SAVED_QUERY');

export const setSearchBarFilter = actionCreator<{
  id: InputsModelId;
  filters: Filter[];
}>('SET_SEARCH_BAR_FILTER');
