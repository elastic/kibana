/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { createSelector } from 'reselect';
import { InputsModelId } from '../../store/inputs/constants';
import type { State } from '../../store';
import type {
  GlobalQuery,
  InputsRange,
  InputsRangeTimeOnly,
  Policy,
  TimeRange,
} from '../../store/inputs/model';

export const getPolicy = (inputState: InputsRange | InputsRangeTimeOnly): Policy =>
  inputState.policy;

export const getTimerange = (inputState: InputsRange | InputsRangeTimeOnly): TimeRange =>
  inputState.timerange;

export const getQueries = (inputState: InputsRange): GlobalQuery[] => inputState.queries;

export const getGlobalQueries = (
  state: State,
  id: InputsModelId.global | InputsModelId.timeline
): GlobalQuery[] => {
  const inputsRange = state.inputs[id];
  return !isEmpty(inputsRange.linkTo)
    ? inputsRange.linkTo.reduce<GlobalQuery[]>((acc, linkToId: InputsModelId) => {
        if (linkToId === InputsModelId.valueReport) {
          return acc;
        }
        const linkToIdInputsRange: InputsRange = state.inputs[linkToId];
        return [...acc, ...linkToIdInputsRange.queries];
      }, inputsRange.queries)
    : inputsRange.queries;
};

export const policySelector = () => createSelector(getPolicy, (policy) => policy.kind);

export const durationSelector = () => createSelector(getPolicy, (policy) => policy.duration);

export const kindSelector = () => createSelector(getTimerange, (timerange) => timerange.kind);

export const startSelector = () => createSelector(getTimerange, (timerange) => timerange.from);

export const endSelector = () => createSelector(getTimerange, (timerange) => timerange.to);

export const fromStrSelector = () => createSelector(getTimerange, (timerange) => timerange.fromStr);

export const toStrSelector = () => createSelector(getTimerange, (timerange) => timerange.toStr);

export const isLoadingSelector = () =>
  createSelector(getQueries, (queries) => queries.some((i) => i.loading === true));

export const queriesSelector = () =>
  createSelector(getGlobalQueries, (queries) => queries.filter((q) => q.id !== 'kql'));

export const kqlQuerySelector = () =>
  createSelector(getQueries, (queries) => queries.find((q) => q.id === 'kql'));
