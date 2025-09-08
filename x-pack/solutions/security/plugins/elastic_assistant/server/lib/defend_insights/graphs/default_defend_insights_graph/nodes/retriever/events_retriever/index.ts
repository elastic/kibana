/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import type { Document } from '@langchain/core/documents';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import type { DefendInsightType, Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import type { AIAssistantKnowledgeBaseDataClient } from '../../../../../../../ai_assistant_data_clients/knowledge_base';
import { getAnonymizedEvents } from './get_events';

export type CustomRetrieverInput = BaseRetrieverInput;

export class AnonymizedEventsRetriever extends BaseRetriever {
  lc_namespace = ['langchain', 'retrievers'];

  private readonly insightType: DefendInsightType;
  private readonly endpointIds: string[];
  private readonly anonymizationFields?: AnonymizationFieldResponse[];
  private readonly esClient: ElasticsearchClient;
  private readonly kbDataClient: AIAssistantKnowledgeBaseDataClient | null;
  private readonly onNewReplacements?: (newReplacements: Replacements) => void;
  private readonly replacements?: Replacements;
  private readonly size?: number;
  private readonly start?: DateMath;
  private readonly end?: DateMath;

  constructor({
    insightType,
    endpointIds,
    anonymizationFields,
    fields,
    esClient,
    kbDataClient,
    onNewReplacements,
    replacements,
    size,
    start,
    end,
  }: {
    insightType: DefendInsightType;
    endpointIds: string[];
    anonymizationFields?: AnonymizationFieldResponse[];
    esClient: ElasticsearchClient;
    kbDataClient: AIAssistantKnowledgeBaseDataClient | null;
    fields?: CustomRetrieverInput;
    onNewReplacements?: (newReplacements: Replacements) => void;
    replacements?: Replacements;
    size?: number;
    start?: DateMath;
    end?: DateMath;
  }) {
    super(fields);

    this.insightType = insightType;
    this.endpointIds = endpointIds;
    this.anonymizationFields = anonymizationFields;
    this.esClient = esClient;
    this.kbDataClient = kbDataClient;
    this.onNewReplacements = onNewReplacements;
    this.replacements = replacements;
    this.size = size;
    this.start = start;
    this.end = end;
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const anonymizedEvents = await getAnonymizedEvents({
      insightType: this.insightType,
      endpointIds: this.endpointIds,
      anonymizationFields: this.anonymizationFields,
      esClient: this.esClient,
      kbDataClient: this.kbDataClient,
      onNewReplacements: this.onNewReplacements,
      replacements: this.replacements,
      size: this.size,
      start: this.start,
      end: this.end,
    });

    return anonymizedEvents.map((event) => ({
      pageContent: event,
      metadata: {},
    }));
  }
}
