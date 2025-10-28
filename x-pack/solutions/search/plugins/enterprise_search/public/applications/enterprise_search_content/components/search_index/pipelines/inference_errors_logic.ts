/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeLogicType } from 'kea';
import { kea } from 'kea';

import { Status } from '../../../../../../common/types/api';
import type { MlInferenceError } from '../../../../../../common/types/pipelines';
import type { FetchMlInferenceErrorsApiLogicResponse } from '../../../api/pipelines/fetch_ml_inference_pipeline_errors';
import { FetchMlInferenceErrorsApiLogic } from '../../../api/pipelines/fetch_ml_inference_pipeline_errors';
import { IndexNameLogic } from '../index_name_logic';

interface InferenceErrorsValues {
  fetchIndexInferenceHistoryStatus: Status;
  indexName: string;
  inferenceErrors: MlInferenceError[];
  inferenceErrorsData: FetchMlInferenceErrorsApiLogicResponse | undefined;
  isLoading: boolean;
}

export const InferenceErrorsLogic = kea<MakeLogicType<InferenceErrorsValues, {}>>({
  connect: {
    values: [
      IndexNameLogic,
      ['indexName'],
      FetchMlInferenceErrorsApiLogic,
      ['data as inferenceErrorsData', 'status as fetchIndexInferenceHistoryStatus'],
    ],
  },
  path: ['enterprise_search', 'content', 'pipelines_inference_errors'],
  selectors: ({ selectors }) => ({
    inferenceErrors: [
      () => [selectors.inferenceErrorsData],
      (inferenceErrorsData: FetchMlInferenceErrorsApiLogicResponse | undefined) =>
        inferenceErrorsData?.errors ?? [],
    ],
    isLoading: [
      () => [selectors.fetchIndexInferenceHistoryStatus],
      (fetchIndexInferenceHistoryStatus: Status) =>
        fetchIndexInferenceHistoryStatus !== Status.SUCCESS &&
        fetchIndexInferenceHistoryStatus !== Status.ERROR,
    ],
  }),
});
