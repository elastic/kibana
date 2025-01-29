/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';
import { TrainedModelState } from '../../../../../../../common/types/pipelines';

import { MappingsApiLogic } from '../../../../api/mappings/mappings_logic';
import { CachedFetchModelsApiLogic } from '../../../../api/ml_models/cached_fetch_models_api_logic';
import { FetchMlInferencePipelineProcessorsApiLogic } from '../../../../api/pipelines/fetch_ml_inference_pipeline_processors';
import {
  FetchMlInferencePipelinesApiLogic,
  FetchMlInferencePipelinesResponse,
} from '../../../../api/pipelines/fetch_ml_inference_pipelines';

import { PipelineSelectLogic, PipelineSelectValues } from './pipeline_select_logic';
import { AddInferencePipelineSteps } from './types';

const DEFAULT_VALUES: PipelineSelectValues = {
  addInferencePipelineModal: {
    configuration: {
      modelID: '',
      pipelineName: '',
      targetField: '',
    },
    indexName: '',
    step: AddInferencePipelineSteps.Configuration,
  },
  existingInferencePipelines: [],
  mlInferencePipelineProcessors: undefined,
  mlInferencePipelinesData: undefined,
  selectableModels: [],
  sourceFields: undefined,
};

const DEFAULT_MODELS: MlModel[] = [
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

const DEFAULT_PIPELINES: FetchMlInferencePipelinesResponse = {
  'my-pipeline': {
    processors: [
      {
        inference: {
          field_map: {
            body: 'text_field',
          },
          model_id: DEFAULT_MODELS[0].modelId,
          target_field: 'ml.inference.body',
        },
      },
    ],
    version: 1,
  },
};

describe('PipelineSelectLogic', () => {
  const { mount } = new LogicMounter(PipelineSelectLogic);
  const { mount: mountFetchMlInferencePipelineProcessorsApiLogic } = new LogicMounter(
    FetchMlInferencePipelineProcessorsApiLogic
  );
  const { mount: mountFetchMlInferencePipelinesApiLogic } = new LogicMounter(
    FetchMlInferencePipelinesApiLogic
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mountFetchMlInferencePipelineProcessorsApiLogic();
    mountFetchMlInferencePipelinesApiLogic();
    mount();
  });

  describe('actions', () => {
    describe('selectExistingPipeline', () => {
      it('updates inference pipeline configuration', () => {
        mount(DEFAULT_VALUES);
        jest.spyOn(PipelineSelectLogic.actions, 'setInferencePipelineConfiguration');

        FetchMlInferencePipelinesApiLogic.actions.apiSuccess(DEFAULT_PIPELINES);
        PipelineSelectLogic.actions.selectExistingPipeline('my-pipeline');

        expect(PipelineSelectLogic.actions.setInferencePipelineConfiguration).toHaveBeenCalledWith({
          existingPipeline: true,
          modelID: DEFAULT_MODELS[0].modelId,
          pipelineName: 'my-pipeline',
          fieldMappings: [
            {
              sourceField: 'body',
              targetField: 'ml.inference.body',
            },
          ],
          targetField: '',
        });
      });
      it('does not update inference pipeline configuration if pipeline name is not in list of fetched pipelines', () => {
        mount(DEFAULT_VALUES);
        jest.spyOn(PipelineSelectLogic.actions, 'setInferencePipelineConfiguration');

        FetchMlInferencePipelinesApiLogic.actions.apiSuccess(DEFAULT_PIPELINES);
        PipelineSelectLogic.actions.selectExistingPipeline('nonexistent-pipeline');

        expect(
          PipelineSelectLogic.actions.setInferencePipelineConfiguration
        ).not.toHaveBeenCalled();
      });
      it('does not update inference pipeline configuration if inference processor cannot be parsed from fetched pipeline', () => {
        mount(DEFAULT_VALUES);
        jest.spyOn(PipelineSelectLogic.actions, 'setInferencePipelineConfiguration');

        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'my-pipeline': {
            processors: [
              {
                set: {
                  // No inference processor
                  field: 'some-field',
                },
              },
            ],
            version: 1,
          },
        });
        PipelineSelectLogic.actions.selectExistingPipeline('my-pipeline');

        expect(
          PipelineSelectLogic.actions.setInferencePipelineConfiguration
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('selectors', () => {
    describe('existingInferencePipelines', () => {
      beforeEach(() => {
        CachedFetchModelsApiLogic.actions.apiSuccess(DEFAULT_MODELS);
        MappingsApiLogic.actions.apiSuccess({
          mappings: {
            properties: {
              body: {
                type: 'text',
              },
            },
          },
        });
      });
      it('returns empty list when there are no existing pipelines available', () => {
        expect(PipelineSelectLogic.values.existingInferencePipelines).toEqual([]);
      });
      it('returns existing pipeline option', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess(DEFAULT_PIPELINES);

        expect(PipelineSelectLogic.values.existingInferencePipelines).toEqual([
          {
            disabled: false,
            modelId: DEFAULT_MODELS[0].modelId,
            modelType: 'ner',
            pipelineName: 'my-pipeline',
            sourceFields: ['body'],
            indexFields: ['body'],
          },
        ]);
      });
      it('returns disabled pipeline option if missing source fields', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'my-pipeline': {
            processors: [
              {
                inference: {
                  field_map: {
                    title: 'text_field', // Does not exist in index
                  },
                  model_id: DEFAULT_MODELS[0].modelId,
                  target_field: 'ml.inference.title',
                },
              },
              {
                inference: {
                  field_map: {
                    body: 'text_field', // Exists in index
                  },
                  model_id: DEFAULT_MODELS[0].modelId,
                  target_field: 'ml.inference.body',
                },
              },
              {
                inference: {
                  field_map: {
                    body_content: 'text_field', // Does not exist in index
                  },
                  model_id: DEFAULT_MODELS[0].modelId,
                  target_field: 'ml.inference.body_content',
                },
              },
            ],
            version: 1,
          },
        });

        expect(PipelineSelectLogic.values.existingInferencePipelines).toEqual([
          {
            disabled: true,
            disabledReason: expect.stringContaining('title, body_content'),
            modelId: DEFAULT_MODELS[0].modelId,
            modelType: 'ner',
            pipelineName: 'my-pipeline',
            sourceFields: ['title', 'body', 'body_content'],
            indexFields: ['body'],
          },
        ]);
      });
      it('returns enabled pipeline option if model is redacted', () => {
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess({
          'my-pipeline': {
            processors: [
              {
                inference: {
                  field_map: {
                    body: 'text_field',
                  },
                  model_id: '', // Redacted
                  target_field: 'ml.inference.body',
                },
              },
            ],
            version: 1,
          },
        });

        expect(PipelineSelectLogic.values.existingInferencePipelines).toEqual([
          {
            disabled: false,
            pipelineName: 'my-pipeline',
            modelType: '',
            modelId: '',
            sourceFields: ['body'],
            indexFields: ['body'],
          },
        ]);
      });
      it('filters pipeline if pipeline already attached', () => {
        FetchMlInferencePipelineProcessorsApiLogic.actions.apiSuccess([
          {
            modelId: DEFAULT_MODELS[0].modelId,
            modelState: TrainedModelState.Started,
            pipelineName: 'my-pipeline',
            pipelineReferences: ['test@ml-inference'],
            types: ['ner', 'pytorch'],
          },
        ]);
        FetchMlInferencePipelinesApiLogic.actions.apiSuccess(DEFAULT_PIPELINES);

        expect(PipelineSelectLogic.values.existingInferencePipelines).toEqual([]);
      });
    });
  });
});
