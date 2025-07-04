/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../../__mocks__/kea_logic';

import { HttpResponse } from '@kbn/core/public';

import { ErrorResponse, HttpError, Status } from '../../../../../../../../common/types/api';
import { MlModelDeploymentState } from '../../../../../../../../common/types/ml';
import { CreateTextExpansionModelApiLogic } from '../../../../../api/ml_models/text_expansion/create_text_expansion_model_api_logic';
import { FetchTextExpansionModelApiLogic } from '../../../../../api/ml_models/text_expansion/fetch_text_expansion_model_api_logic';
import { StartTextExpansionModelApiLogic } from '../../../../../api/ml_models/text_expansion/start_text_expansion_model_api_logic';

import {
  getTextExpansionError,
  TextExpansionCalloutLogic,
  TextExpansionCalloutValues,
} from './text_expansion_callout_logic';

const DEFAULT_VALUES: TextExpansionCalloutValues = {
  createTextExpansionModelError: undefined,
  createTextExpansionModelStatus: Status.IDLE,
  createdTextExpansionModel: undefined,
  fetchTextExpansionModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelRunningSingleThreaded: false,
  isModelStarted: false,
  isPollingTextExpansionModelActive: false,
  isStartButtonDisabled: false,
  startTextExpansionModelError: undefined,
  startTextExpansionModelStatus: Status.IDLE,
  textExpansionModel: undefined,
  textExpansionModelPollTimeoutId: null,
  textExpansionError: null,
  elserModelId: '.elser_model_2',
};

jest.useFakeTimers();

describe('TextExpansionCalloutLogic', () => {
  const { mount } = new LogicMounter(TextExpansionCalloutLogic);
  const { mount: mountCreateTextExpansionModelApiLogic } = new LogicMounter(
    CreateTextExpansionModelApiLogic
  );
  const { mount: mountFetchTextExpansionModelApiLogic } = new LogicMounter(
    FetchTextExpansionModelApiLogic
  );
  const { mount: mountStartTextExpansionModelApiLogic } = new LogicMounter(
    StartTextExpansionModelApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountCreateTextExpansionModelApiLogic();
    mountFetchTextExpansionModelApiLogic();
    mountStartTextExpansionModelApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(TextExpansionCalloutLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('getTextExpansionError', () => {
    const error = {
      body: {
        error: 'some-error',
        message: 'some-error-message',
        statusCode: 500,
      },
    } as HttpError;
    it('returns null if there is no error', () => {
      expect(getTextExpansionError(undefined, undefined, undefined)).toBe(null);
    });
    it('uses the correct title and message from a create error', () => {
      expect(getTextExpansionError(error, undefined, undefined)).toEqual({
        title: 'Error with ELSER deployment',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a fetch error', () => {
      expect(getTextExpansionError(undefined, error, undefined)).toEqual({
        title: 'Error fetching ELSER model',
        message: error.body?.message,
      });
    });
    it('uses the correct title and message from a start error', () => {
      expect(getTextExpansionError(undefined, undefined, error)).toEqual({
        title: 'Error starting ELSER deployment',
        message: error.body?.message,
      });
    });
  });

  describe('listeners', () => {
    describe('createTextExpansionModelPollingTimeout', () => {
      const duration = 5000;
      it('sets polling timeout', () => {
        jest.spyOn(global, 'setTimeout');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'setTextExpansionModelPollingId');

        TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout(duration);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), duration);
        expect(TextExpansionCalloutLogic.actions.setTextExpansionModelPollingId).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout(duration);

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('createTextExpansionModelSuccess', () => {
      it('sets createdTextExpansionModel', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'fetchTextExpansionModel');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.createTextExpansionModelSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });

        expect(TextExpansionCalloutLogic.actions.fetchTextExpansionModel).toHaveBeenCalled();
        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('fetchTextExpansionModelSuccess', () => {
      const data = {
        deploymentState: MlModelDeploymentState.Downloading,
        modelId: 'mock-model-id',
        targetAllocationCount: 1,
        nodeAllocationCount: 1,
        threadsPerAllocation: 1,
      };

      it('starts polling when the model is downloading and polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'startPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess(data);

        expect(TextExpansionCalloutLogic.actions.startPollingTextExpansionModel).toHaveBeenCalled();
      });
      it('sets polling timeout when the model is downloading and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess(data);

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('stops polling when the model is downloaded and polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'stopPollingTextExpansionModel');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });

        expect(TextExpansionCalloutLogic.actions.stopPollingTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('fetchTextExpansionModelError', () => {
      it('stops polling if it is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.fetchTextExpansionModelError({
          body: {
            error: '',
            message: 'some error',
            statusCode: 500,
          },
        } as HttpResponse<ErrorResponse>);

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
    });

    describe('startPollingTextExpansionModel', () => {
      it('sets polling timeout', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'createTextExpansionModelPollingTimeout');

        TextExpansionCalloutLogic.actions.startPollingTextExpansionModel();

        expect(
          TextExpansionCalloutLogic.actions.createTextExpansionModelPollingTimeout
        ).toHaveBeenCalled();
      });
      it('clears polling timeout if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');

        TextExpansionCalloutLogic.actions.startPollingTextExpansionModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
      });
    });

    describe('startTextExpansionModelSuccess', () => {
      it('sets startedTextExpansionModel', () => {
        jest.spyOn(TextExpansionCalloutLogic.actions, 'fetchTextExpansionModel');

        TextExpansionCalloutLogic.actions.startTextExpansionModelSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
        });

        expect(TextExpansionCalloutLogic.actions.fetchTextExpansionModel).toHaveBeenCalled();
      });
    });

    describe('stopPollingTextExpansionModel', () => {
      it('clears polling timeout and poll timeout ID if it is set', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        jest.spyOn(global, 'clearTimeout');
        jest.spyOn(TextExpansionCalloutLogic.actions, 'clearTextExpansionModelPollingId');

        TextExpansionCalloutLogic.actions.stopPollingTextExpansionModel();

        expect(clearTimeout).toHaveBeenCalledWith('timeout-id');
        expect(
          TextExpansionCalloutLogic.actions.clearTextExpansionModelPollingId
        ).toHaveBeenCalled();
      });
    });
  });

  describe('reducers', () => {
    describe('textExpansionModelPollTimeoutId', () => {
      it('gets cleared on clearTextExpansionModelPollingId', () => {
        TextExpansionCalloutLogic.actions.clearTextExpansionModelPollingId();

        expect(TextExpansionCalloutLogic.values.textExpansionModelPollTimeoutId).toBe(null);
      });
      it('gets set on setTextExpansionModelPollingId', () => {
        const timeout = setTimeout(() => {}, 500);
        TextExpansionCalloutLogic.actions.setTextExpansionModelPollingId(timeout);

        expect(TextExpansionCalloutLogic.values.textExpansionModelPollTimeoutId).toEqual(timeout);
      });
    });
  });

  describe('selectors', () => {
    describe('isCreateButtonDisabled', () => {
      it('is set to false if the fetch model API is idle', () => {
        CreateTextExpansionModelApiLogic.actions.apiReset();
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(false);
      });
      it('is set to true if the fetch model API is not idle', () => {
        CreateTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
        });
        expect(TextExpansionCalloutLogic.values.isCreateButtonDisabled).toBe(true);
      });
    });

    describe('textExpansionError', () => {
      const error = {
        body: {
          error: 'Error with ELSER deployment',
          message: 'Mocked error message',
          statusCode: 500,
        },
      } as HttpError;

      it('returns null when there are no errors', () => {
        CreateTextExpansionModelApiLogic.actions.apiReset();
        FetchTextExpansionModelApiLogic.actions.apiReset();
        StartTextExpansionModelApiLogic.actions.apiReset();
        expect(TextExpansionCalloutLogic.values.textExpansionError).toBe(null);
      });
      it('returns extracted error for create', () => {
        CreateTextExpansionModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error with ELSER deployment',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for fetch', () => {
        FetchTextExpansionModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error fetching ELSER model',
          message: 'Mocked error message',
        });
      });
      it('returns extracted error for start', () => {
        StartTextExpansionModelApiLogic.actions.apiError(error);
        expect(TextExpansionCalloutLogic.values.textExpansionError).toStrictEqual({
          title: 'Error starting ELSER deployment',
          message: 'Mocked error message',
        });
      });
    });

    describe('isModelDownloadInProgress', () => {
      it('is set to true if the model is downloading', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloading,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(true);
      });
      it('is set to false if the model is downloading', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Started,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloadInProgress).toBe(false);
      });
    });

    describe('isModelDownloaded', () => {
      it('is set to true if the model is downloaded', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.Downloaded,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(true);
      });
      it('is set to false if the model is not downloaded', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelDownloaded).toBe(false);
      });
    });

    describe('isModelRunningSingleThreaded', () => {
      it('is set to true if the model has 1 target allocation and 1 thread', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(true);
      });
      it('is set to false if the model has multiple target allocations', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 2,
          nodeAllocationCount: 2,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
      it('is set to false if the model runs on multiple threads', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 4,
        });
        expect(TextExpansionCalloutLogic.values.isModelRunningSingleThreaded).toBe(false);
      });
    });

    describe('isModelStarted', () => {
      it('is set to true if the model is started', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.FullyAllocated,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelStarted).toBe(true);
      });
      it('is set to false if the model is not started', () => {
        FetchTextExpansionModelApiLogic.actions.apiSuccess({
          deploymentState: MlModelDeploymentState.NotDeployed,
          modelId: 'mock-model-id',
          targetAllocationCount: 1,
          nodeAllocationCount: 1,
          threadsPerAllocation: 1,
        });
        expect(TextExpansionCalloutLogic.values.isModelStarted).toBe(false);
      });
    });

    describe('isPollingTextExpansionModelActive', () => {
      it('is set to false if polling is not active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: null,
        });

        expect(TextExpansionCalloutLogic.values.isPollingTextExpansionModelActive).toBe(false);
      });
      it('is set to true if polling is active', () => {
        mount({
          ...DEFAULT_VALUES,
          textExpansionModelPollTimeoutId: 'timeout-id',
        });

        expect(TextExpansionCalloutLogic.values.isPollingTextExpansionModelActive).toBe(true);
      });
    });
  });
});
