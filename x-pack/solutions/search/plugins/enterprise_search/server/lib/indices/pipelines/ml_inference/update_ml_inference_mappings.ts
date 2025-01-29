/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { FieldMapping } from '../../../../../common/ml_inference_pipeline';

import { ErrorCode } from '../../../../../common/types/error_codes';

import { isIllegalArgumentException } from '../../../../utils/identify_exceptions';

/**
 * Creates Elasticsearch field mappings so that the outputs of ML Inference pipelines are not indexed as `float` fields
 * @param indexName - the index whose mapping will be updated
 * @param fieldMappings - the array of objects representing the source field (text) names and target fields (ML output) names
 * @param esClient
 */
export const updateMlInferenceMappings = async (
  indexName: string,
  modelId: string,
  fieldMappings: FieldMapping[],
  esClient: ElasticsearchClient
) => {
  // Check if the model is of text_expansion type, if not, skip the mapping update
  if (!(await isTextExpansionModel(modelId, esClient))) {
    return {
      acknowledged: false,
    };
  }

  const sourceFields = fieldMappings.map(({ sourceField }) => sourceField);

  const nonDefaultTargetFields = fieldMappings
    .filter(
      (fieldMapping) =>
        fieldMapping.targetField !== `ml.inference.${fieldMapping.sourceField}_expanded`
    )
    .map((fieldMapping) => fieldMapping.targetField);

  // Today, we only update mappings for text_expansion fields.
  const mapping = generateTextExpansionMappingProperties(sourceFields, nonDefaultTargetFields);
  try {
    return await esClient.indices.putMapping({
      index: indexName,
      properties: mapping,
    });
  } catch (e) {
    if (isIllegalArgumentException(e)) {
      throw new Error(ErrorCode.MAPPING_UPDATE_FAILED);
    } else {
      throw e;
    }
  }
};

const generateTextExpansionMappingProperties = (sourceFields: string[], targetFields: string[]) => {
  return {
    ml: {
      properties: {
        inference: {
          properties: {
            ...formDefaultElserMappingProps(sourceFields),
          },
        },
      },
    },
    ...targetFields.reduce(
      (previous, targetField) => ({
        ...previous,
        [targetField]: {
          properties: {
            model_id: {
              type: 'keyword',
            },
            predicted_value: {
              type: 'sparse_vector',
            },
          },
        },
      }),
      {}
    ),
  };
};

const formDefaultElserMappingProps = (sourceFields: string[]) => {
  return sourceFields.reduce(
    (previous, sourceField) => ({
      ...previous,
      [`${sourceField}_expanded`]: {
        properties: {
          model_id: {
            type: 'keyword',
          },
          predicted_value: {
            type: 'sparse_vector',
          },
        },
      },
    }),
    {}
  );
};

const isTextExpansionModel = async (modelId: string, esClient: ElasticsearchClient) => {
  const models = await esClient.ml.getTrainedModels({ model_id: modelId });

  return models.trained_model_configs[0]?.inference_config?.text_expansion !== undefined;
};
