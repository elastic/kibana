/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { DEFAULT_GROUPING_OPTIONS } from '../../../detections/components/alerts_table/alerts_grouping';
import { updateGroups } from './actions';
import type { Groups } from './types';

export const initialGroupingState: Groups = {};

const EMPTY_ACTIVE_GROUP: string[] = [];

export const groupsReducer = reducerWithInitialState(initialGroupingState).case(
  updateGroups,
  (state, { tableId, ...rest }) => ({
    ...state,
    [tableId]: {
      activeGroups: EMPTY_ACTIVE_GROUP,
      options: DEFAULT_GROUPING_OPTIONS,
      ...(state[tableId] ? state[tableId] : {}),
      ...rest,
    },
  })
);
