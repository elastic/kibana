/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import type { QueryGenerationFieldDescriptors, IndexQueryFields } from './types';

export function buildFieldDescriptorForIndex(
  indexName: string,
  indexMappings: IndicesGetMappingIndexMappingRecord
): QueryGenerationFieldDescriptors {
  const indexFields: IndexQueryFields = {
    elser_query_fields: [],
    dense_vector_query_fields: [],
    bm25_query_fields: [],
    source_fields: [],
    semantic_fields: [],
    skipped_fields: 0,
  };
  const result: QueryGenerationFieldDescriptors = {
    [indexName]: indexFields,
  };

  if (!indexMappings.mappings.properties) {
    return result;
  }
  for (const [fieldName, fieldDescriptor] of Object.entries(indexMappings.mappings.properties)) {
    const fieldParsed = parseField(fieldName, fieldDescriptor, indexFields, indexName);
    let nestedPropertiesParsed = false;
    let nestedFieldsParsed = false;
    if (hasMappingsProperties(fieldDescriptor)) {
      nestedPropertiesParsed = parseNestedFields(
        fieldName,
        fieldDescriptor.properties,
        indexFields,
        indexName
      );
    }
    if (hasMappingsFields(fieldDescriptor)) {
      nestedFieldsParsed = parseNestedFields(
        fieldName,
        fieldDescriptor.fields,
        indexFields,
        indexName
      );
    }
    if (!fieldParsed && !nestedPropertiesParsed && !nestedFieldsParsed) {
      indexFields.skipped_fields++;
    }
  }

  return result;
}

function parseField(
  fieldName: string,
  fieldDescriptor: MappingProperty,
  indexFields: IndexQueryFields,
  indexName: string
): boolean {
  if (fieldDescriptor.type === 'dense_vector') {
    indexFields.dense_vector_query_fields.push({
      field: fieldName,
      model_id: '',
      indices: [indexName],
    });
    return true;
  } else if (fieldDescriptor.type === 'sparse_vector') {
    indexFields.elser_query_fields.push({
      field: fieldName,
      model_id: '',
      indices: [indexName],
      sparse_vector: true,
    });
    return true;
  } else if (fieldDescriptor.type === 'text' || fieldDescriptor.type === 'keyword') {
    indexFields.bm25_query_fields.push(fieldName);
    indexFields.source_fields.push(fieldName);
    return true;
  } else if (fieldDescriptor.type === 'semantic_text') {
    const embeddingType = embeddingTypeFromTaskType(
      // @ts-ignore - model_settings is missing from the spec, but can exist
      fieldDescriptor?.model_settings?.task_type ?? ''
    );
    indexFields.semantic_fields.push({
      field: fieldName,
      inferenceId: fieldDescriptor.inference_id ?? '',
      embeddingType,
      indices: [indexName],
    });
    indexFields.source_fields.push(fieldName);
    return true;
  }
  return false;
}

function parseNestedFields(
  parentFieldName: string,
  fields: Record<string, MappingProperty>,
  indexFields: IndexQueryFields,
  indexName: string
) {
  const parsedFields = [];
  for (const [fieldName, fieldDescriptor] of Object.entries(fields)) {
    const fullFieldName = `${parentFieldName}.${fieldName}`;
    if (parseField(fullFieldName, fieldDescriptor, indexFields, indexName)) {
      parsedFields.push(fullFieldName);
    }
    if (
      hasMappingsProperties(fieldDescriptor) &&
      parseNestedFields(fullFieldName, fieldDescriptor.properties, indexFields, indexName)
    ) {
      parsedFields.push(fullFieldName);
    }
    if (
      hasMappingsFields(fieldDescriptor) &&
      parseNestedFields(fullFieldName, fieldDescriptor.fields, indexFields, indexName)
    ) {
      parsedFields.push(fullFieldName);
    }
  }
  return parsedFields.length > 0;
}

function embeddingTypeFromTaskType(taskType: string): 'dense_vector' | 'sparse_vector' {
  switch (taskType) {
    case 'sparse_embedding':
      return 'sparse_vector';
    case 'text_embedding':
      return 'dense_vector';
    default:
      return 'dense_vector';
  }
}

function hasMappingsProperties(
  fieldDescriptor: MappingProperty
): fieldDescriptor is MappingProperty & { properties: Record<string, MappingProperty> } {
  return 'properties' in fieldDescriptor;
}
function hasMappingsFields(
  fieldDescriptor: MappingProperty
): fieldDescriptor is MappingProperty & { fields: Record<string, MappingProperty> } {
  return 'fields' in fieldDescriptor;
}
