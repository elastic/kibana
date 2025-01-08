/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockHttpValues } from '../../../__mocks__/kea_logic';

import {
  attachMlInferencePipeline,
  AttachMlInferencePipelineApiLogicArgs,
  AttachMlInferencePipelineResponse,
} from './attach_ml_inference_pipeline';

describe('AttachMlInferencePipelineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createMlInferencePipeline', () => {
    it('calls the api', async () => {
      const response: Promise<AttachMlInferencePipelineResponse> = Promise.resolve({
        addedToParentPipeline: true,
        created: false,
        id: 'unit-test',
      });
      http.post.mockReturnValue(response);

      const args: AttachMlInferencePipelineApiLogicArgs = {
        indexName: 'unit-test-index',
        pipelineName: 'unit-test',
      };
      const result = await attachMlInferencePipeline(args);
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/unit-test-index/ml_inference/pipeline_processors/attach',
        {
          body: '{"pipeline_name":"unit-test"}',
        }
      );
      expect(result).toEqual({
        addedToParentPipeline: true,
        created: false,
        id: args.pipelineName,
      });
    });
  });
});
