/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { HttpError, Status } from '../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../common/types/ml';

import { MlModel } from '../../../../../common/types/ml';

import {
  CachedFetchModelsApiLogic,
  CachedFetchModelsApiLogicValues,
} from './cached_fetch_models_api_logic';
import { FetchModelsApiLogic } from './fetch_models_api_logic';

const DEFAULT_VALUES: CachedFetchModelsApiLogicValues = {
  data: [],
  isInitialLoading: false,
  isLoading: false,
  modelsData: null,
  pollTimeoutId: null,
  status: Status.IDLE,
};

const FETCH_MODELS_API_DATA_RESPONSE: MlModel[] = [
  {
    modelId: 'model_1',
    type: 'ner',
    title: 'Model 1',
    description: 'Model 1 description',
    licenseType: 'elastic',
    modelDetailsPageUrl: 'https://my-model.ai',
    deploymentState: MlModelDeploymentState.NotDeployed,
    startTime: 0,
    targetAllocationCount: 0,
    nodeAllocationCount: 0,
    threadsPerAllocation: 0,
    isPlaceholder: false,
    hasStats: false,
    types: ['pytorch', 'ner'],
    inputFieldNames: ['title'],
    version: '1',
  },
];
const FETCH_MODELS_API_ERROR_RESPONSE = {
  body: {
    error: 'Error while fetching models',
    message: 'Error while fetching models',
    statusCode: 500,
  },
} as HttpError;

jest.useFakeTimers();

describe('TextExpansionCalloutLogic', () => {
  const { mount } = new LogicMounter(CachedFetchModelsApiLogic);
  const { mount: mountFetchModelsApiLogic } = new LogicMounter(FetchModelsApiLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchModelsApiLogic();
    mount();
  });

  describe('listeners', () => {
    describe('apiError', () => {
      it('sets new polling timeout if a timeout ID is already set', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        jest.spyOn(CachedFetchModelsApiLogic.actions, 'createPollTimeout');

        CachedFetchModelsApiLogic.actions.apiError(FETCH_MODELS_API_ERROR_RESPONSE);

        expect(CachedFetchModelsApiLogic.actions.createPollTimeout).toHaveBeenCalled();
      });
    });

    describe('apiSuccess', () => {
      it('sets new polling timeout if a timeout ID is already set', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        jest.spyOn(CachedFetchModelsApiLogic.actions, 'createPollTimeout');

        CachedFetchModelsApiLogic.actions.apiSuccess(FETCH_MODELS_API_DATA_RESPONSE);

        expect(CachedFetchModelsApiLogic.actions.createPollTimeout).toHaveBeenCalled();
      });
    });

    describe('createPollTimeout', () => {
      const duration = 5000;
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        CachedFetchModelsApiLogic.actions.createPollTimeout(duration);

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
      it('sets polling timeout', () => {
        jest.spyOn(global, 'setTimeout');
        jest.spyOn(CachedFetchModelsApiLogic.actions, 'setTimeoutId');

        CachedFetchModelsApiLogic.actions.createPollTimeout(duration);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), duration);
        expect(CachedFetchModelsApiLogic.actions.setTimeoutId).toHaveBeenCalled();
      });
    });

    describe('startPolling', () => {
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        CachedFetchModelsApiLogic.actions.startPolling();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
      it('makes API request and sets polling timeout', () => {
        jest.spyOn(CachedFetchModelsApiLogic.actions, 'makeRequest');
        jest.spyOn(CachedFetchModelsApiLogic.actions, 'createPollTimeout');

        CachedFetchModelsApiLogic.actions.startPolling();

        expect(CachedFetchModelsApiLogic.actions.makeRequest).toHaveBeenCalled();
        expect(CachedFetchModelsApiLogic.actions.createPollTimeout).toHaveBeenCalled();
      });
    });

    describe('stopPolling', () => {
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        CachedFetchModelsApiLogic.actions.stopPolling();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
      it('clears polling timeout value', () => {
        jest.spyOn(CachedFetchModelsApiLogic.actions, 'clearPollTimeout');

        CachedFetchModelsApiLogic.actions.stopPolling();

        expect(CachedFetchModelsApiLogic.actions.clearPollTimeout).toHaveBeenCalled();
      });
    });
  });

  describe('reducers', () => {
    describe('modelsData', () => {
      it('gets cleared on API reset', () => {
        mount({
          ...DEFAULT_VALUES,
          modelsData: [],
        });

        CachedFetchModelsApiLogic.actions.apiReset();

        expect(CachedFetchModelsApiLogic.values.modelsData).toBe(null);
      });
      it('gets set on API success', () => {
        CachedFetchModelsApiLogic.actions.apiSuccess(FETCH_MODELS_API_DATA_RESPONSE);

        expect(CachedFetchModelsApiLogic.values.modelsData).toEqual(FETCH_MODELS_API_DATA_RESPONSE);
      });
    });

    describe('pollTimeoutId', () => {
      it('gets cleared on clear timeout action', () => {
        mount({
          ...DEFAULT_VALUES,
          pollTimeoutId: 'timeout-id',
        });

        CachedFetchModelsApiLogic.actions.clearPollTimeout();

        expect(CachedFetchModelsApiLogic.values.pollTimeoutId).toBe(null);
      });
      it('gets set on set timeout action', () => {
        const timeout = setTimeout(() => {}, 500);

        CachedFetchModelsApiLogic.actions.setTimeoutId(timeout);

        expect(CachedFetchModelsApiLogic.values.pollTimeoutId).toEqual(timeout);
      });
    });
  });

  describe('selectors', () => {
    describe('isInitialLoading', () => {
      it('true if API is idle', () => {
        mount(DEFAULT_VALUES);

        expect(CachedFetchModelsApiLogic.values.isInitialLoading).toBe(true);
      });
      it('true if API is loading for the first time', () => {
        mount({
          ...DEFAULT_VALUES,
          status: Status.LOADING,
        });

        expect(CachedFetchModelsApiLogic.values.isInitialLoading).toBe(true);
      });
      it('false if the API is neither idle nor loading', () => {
        CachedFetchModelsApiLogic.actions.apiSuccess(FETCH_MODELS_API_DATA_RESPONSE);

        expect(CachedFetchModelsApiLogic.values.isInitialLoading).toBe(false);
      });
    });
  });
});
