/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LogicMounter, mockFlashMessageHelpers } from '../../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError } from '../../../../../../common/types/api';
import { MlInferenceHistoryResponse } from '../../../../../../common/types/pipelines';
import { FetchMlInferencePipelineHistoryApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_history';

import { InferenceHistoryValues, InferenceHistoryLogic } from './inference_history_logic';

const DEFAULT_VALUES: InferenceHistoryValues = {
  fetchIndexInferenceHistoryStatus: 0,
  indexName: '',
  inferenceHistory: undefined,
  inferenceHistoryData: undefined,
  isLoading: true,
};

describe('InferenceHistoryLogic', () => {
  const { mount } = new LogicMounter(InferenceHistoryLogic);
  const { mount: mountFetchMlInferencePipelineHistoryApiLogic } = new LogicMounter(
    FetchMlInferencePipelineHistoryApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchMlInferencePipelineHistoryApiLogic();
    mount();
  });

  it('has expected default values', () => {
    expect(InferenceHistoryLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    it('flashes errors on history fetch error', async () => {
      const error = {
        body: {
          error: '',
          message: 'this is an error',
          statusCode: 500,
        },
      } as HttpError;
      FetchMlInferencePipelineHistoryApiLogic.actions.apiError(error);
      await nextTick();

      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith(error);
    });
    it('clears flash messages on history fetch', async () => {
      FetchMlInferencePipelineHistoryApiLogic.actions.makeRequest({ indexName: 'test' });
      await nextTick();
      expect(mockFlashMessageHelpers.clearFlashMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectors', () => {
    describe('inferenceHistory', () => {
      it('returns history from api response', () => {
        const historyResponse: MlInferenceHistoryResponse = {
          history: [
            {
              doc_count: 10,
              pipeline: 'unit-test',
            },
            {
              doc_count: 12,
              pipeline: 'unit-test-002',
            },
          ],
        };
        FetchMlInferencePipelineHistoryApiLogic.actions.apiSuccess(historyResponse);

        expect(InferenceHistoryLogic.values.inferenceHistory).toEqual(historyResponse.history);
      });
    });
    describe('isLoading', () => {
      it('returns false for success', () => {
        FetchMlInferencePipelineHistoryApiLogic.actions.apiSuccess({ history: [] });
        expect(InferenceHistoryLogic.values.isLoading).toBe(false);
      });
      it('returns false for error', () => {
        FetchMlInferencePipelineHistoryApiLogic.actions.apiError({
          body: {
            error: '',
            message: 'this is an error',
            statusCode: 500,
          },
        } as HttpError);
        expect(InferenceHistoryLogic.values.isLoading).toBe(false);
      });
    });
  });
});
