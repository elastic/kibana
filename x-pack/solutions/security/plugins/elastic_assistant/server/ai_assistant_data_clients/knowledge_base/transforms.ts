/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  DocumentEntry,
  DocumentEntryType,
  IndexEntry,
  IndexEntryType,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { EsKnowledgeBaseEntrySchema, LegacyEsKnowledgeBaseEntrySchema } from './types';

export const transformESSearchToKnowledgeBaseEntry = (
  response: estypes.SearchResponse<EsKnowledgeBaseEntrySchema>
): KnowledgeBaseEntryResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const kbEntrySchema = hit._source!;
      return {
        ...transformEsSchemaToEntry(kbEntrySchema),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
      };
    });
};

export const transformESToKnowledgeBase = (
  response: EsKnowledgeBaseEntrySchema[]
): KnowledgeBaseEntryResponse[] => {
  return response.map((kbEntrySchema) => {
    return transformEsSchemaToEntry(kbEntrySchema);
  });
};

const transformEsSchemaToEntry = (
  esKbEntry: EsKnowledgeBaseEntrySchema
): DocumentEntry | IndexEntry => {
  if (esKbEntry.type === DocumentEntryType.value) {
    const documentEntry: DocumentEntry = {
      id: esKbEntry.id,
      createdAt: esKbEntry.created_at,
      createdBy: esKbEntry.created_by,
      updatedAt: esKbEntry.updated_at,
      updatedBy: esKbEntry.updated_by,
      users:
        esKbEntry.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],

      name: esKbEntry.name,
      namespace: esKbEntry.namespace,
      type: esKbEntry.type,
      kbResource: esKbEntry.kb_resource,
      source: esKbEntry.source,
      required: esKbEntry.required,
      text: esKbEntry.text,
      ...(esKbEntry.vector
        ? {
            vector: {
              modelId: esKbEntry.vector.model_id,
              tokens: esKbEntry.vector.tokens,
            },
          }
        : {}),
    };
    return documentEntry;
  } else if (esKbEntry.type === IndexEntryType.value) {
    const indexEntry: IndexEntry = {
      id: esKbEntry.id,
      createdAt: esKbEntry.created_at,
      createdBy: esKbEntry.created_by,
      updatedAt: esKbEntry.updated_at,
      updatedBy: esKbEntry.updated_by,
      users:
        esKbEntry.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      name: esKbEntry.name,
      namespace: esKbEntry.namespace,
      // Document Entry Fields
      type: esKbEntry.type,
      index: esKbEntry.index,
      field: esKbEntry.field,
      description: esKbEntry.description,
      queryDescription: esKbEntry.query_description,
      inputSchema:
        esKbEntry.input_schema?.map((schema) => ({
          fieldName: schema.field_name,
          fieldType: schema.field_type,
          description: schema.description,
        })) ?? [],
      outputFields: esKbEntry.output_fields ?? [],
    };
    return indexEntry;
  }

  // Parse Legacy KB Entry as a DocumentEntry
  return getDocumentEntryFromLegacyKbEntry(esKbEntry);
};

const getDocumentEntryFromLegacyKbEntry = (
  legacyEsKbDoc: LegacyEsKnowledgeBaseEntrySchema
): DocumentEntry => {
  const documentEntry: DocumentEntry = {
    id: legacyEsKbDoc.id,
    createdAt: legacyEsKbDoc.created_at,
    createdBy: legacyEsKbDoc.created_by,
    updatedAt: legacyEsKbDoc.updated_at,
    updatedBy: legacyEsKbDoc.updated_by,
    users:
      legacyEsKbDoc.users?.map((user) => ({
        id: user.id,
        name: user.name,
      })) ?? [],

    name: legacyEsKbDoc.text,
    namespace: legacyEsKbDoc.namespace,
    type: DocumentEntryType.value,
    kbResource: legacyEsKbDoc.metadata?.kbResource ?? 'unknown',
    source: legacyEsKbDoc.metadata?.source ?? 'unknown',
    required: legacyEsKbDoc.metadata?.required ?? false,
    text: legacyEsKbDoc.text,
    ...(legacyEsKbDoc.vector
      ? {
          vector: {
            modelId: legacyEsKbDoc.vector.model_id,
            tokens: legacyEsKbDoc.vector.tokens,
          },
        }
      : {}),
  };
  return documentEntry;
};
