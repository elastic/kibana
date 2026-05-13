/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type {
  Inputs,
  InputsModel,
  InputsRange,
  InspectQuery,
  Refetch,
  RefetchKql,
  TimeRange,
} from './model';
import { InputsModelId } from './constants';
import type { VisualizationTablesWithMeta } from '../../components/visualization_actions/types';

export const updateInputFullScreen = (
  inputId: InputsModelId,
  fullScreen: boolean,
  state: InputsModel
): InputsModel => ({
  ...state,
  global: {
    ...state.global,
    fullScreen: inputId === InputsModelId.global ? fullScreen : state.global.fullScreen,
  },
  timeline: {
    ...state.timeline,
    fullScreen: inputId === InputsModelId.timeline ? fullScreen : state.timeline.fullScreen,
  },
});

export const updateInputTimerange = (
  inputId: InputsModelId,
  timerange: TimeRange,
  state: InputsModel
): InputsModel => {
  const input = get(inputId, state);
  if (input != null) {
    return {
      ...[inputId, ...input.linkTo].reduce<InputsModel>(
        (acc: InputsModel, linkToId: InputsModelId) => ({
          ...acc,
          [linkToId]: {
            ...get(linkToId, state),
            timerange,
          },
        }),
        inputId === InputsModelId.timeline
          ? { ...state, global: { ...state.global, linkTo: [] } }
          : state
      ),
    };
  }
  return state;
};

export const toggleLockTimeline = (state: InputsModel): InputsModel => {
  const linkToIdAlreadyExist = state.global.linkTo.indexOf(InputsModelId.timeline);
  return linkToIdAlreadyExist > -1
    ? removeInputLink([InputsModelId.global, InputsModelId.timeline], state)
    : addInputLink([InputsModelId.global, InputsModelId.timeline], state);
};

export interface UpdateQueryParams {
  id: string;
  inputId: InputsModelId.global | InputsModelId.timeline;
  inspect: InspectQuery | null;
  loading: boolean;
  refetch: Refetch | RefetchKql;
  state: InputsModel;
  searchSessionId?: string;
  tables?: VisualizationTablesWithMeta;
}

export const upsertQuery = ({
  inputId,
  id,
  inspect,
  loading,
  refetch,
  state,
  searchSessionId,
  tables,
}: UpdateQueryParams): InputsModel => {
  const queryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              {
                id,
                inspect,
                isInspected: state[inputId].queries[queryIndex].isInspected,
                loading,
                refetch,
                searchSessionId: state[inputId].queries[queryIndex].searchSessionId,
                selectedInspectIndex: state[inputId].queries[queryIndex].selectedInspectIndex,
                ...((tables && { tables }) ?? {}),
              },
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [
              ...state[inputId].queries,
              {
                id,
                inspect,
                isInspected: false,
                loading,
                refetch,
                selectedInspectIndex: 0,
                searchSessionId,
                ...((tables && { tables }) ?? {}),
              },
            ],
    },
  };
};

export interface SetIsInspectedParams {
  id: string;
  inputId: InputsModelId.global | InputsModelId.timeline;
  isInspected: boolean;
  selectedInspectIndex: number;
  state: InputsModel;
  searchSessionId?: string;
}

export const setIsInspected = ({
  id,
  inputId,
  isInspected,
  selectedInspectIndex,
  state,
  searchSessionId,
}: SetIsInspectedParams): InputsModel => {
  const myQueryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  const myQuery = myQueryIndex > -1 ? state[inputId].queries[myQueryIndex] : null;
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        myQueryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, myQueryIndex),
              {
                ...myQuery,
                isInspected,
                selectedInspectIndex,
                searchSessionId,
              },
              ...state[inputId].queries.slice(myQueryIndex + 1),
            ]
          : [...state[inputId].queries],
    },
  };
};

export const addInputLink = (linkToIds: InputsModelId[], state: InputsModel): InputsModel => {
  if (linkToIds.length !== 2) {
    throw new Error('Only link 2 input states at a time');
  }
  if (Array.from(new Set(linkToIds)).length === 1) {
    throw new Error('Input linkTo cannot link to itself');
  }
  if (linkToIds.includes(InputsModelId.timeline) && linkToIds.includes(InputsModelId.global)) {
    return {
      ...state,
      timeline: {
        ...state.timeline,
        linkTo: [InputsModelId.global],
      },
      global: {
        ...state.global,
        linkTo: [InputsModelId.timeline],
      },
    };
  }

  return state;
};

export const removeInputLink = (linkToIds: InputsModelId[], state: InputsModel): InputsModel => {
  if (linkToIds.length !== 2) {
    throw new Error('Only remove linkTo from 2 input states at a time');
  }
  if (Array.from(new Set(linkToIds)).length === 1) {
    throw new Error('Input linkTo cannot remove link to itself');
  }
  if (linkToIds.includes(InputsModelId.timeline) && linkToIds.includes(InputsModelId.global)) {
    return {
      ...state,
      timeline: {
        ...state.timeline,
        linkTo: [],
      },
      global: {
        ...state.global,
        linkTo: [],
      },
    };
  }

  return state;
};

export interface DeleteOneQueryParams {
  id: string;
  inputId: InputsModelId.global | InputsModelId.timeline;
  state: InputsModel;
}

export const deleteOneQuery = ({ inputId, id, state }: DeleteOneQueryParams): InputsModel => {
  const queryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [...state[inputId].queries],
    },
  };
};

export const isQueryInput = (inputs: Inputs): inputs is InputsRange => {
  if ('queries' in inputs) {
    return true;
  }
  return false;
};
