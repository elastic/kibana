/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import type { Document } from '@langchain/core/documents';
import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';

import { getAnonymizedAlerts } from '../helpers/get_anonymized_alerts';

export type CustomRetrieverInput = BaseRetrieverInput;

export class AnonymizedAlertsRetriever extends BaseRetriever {
  lc_namespace = ['langchain', 'retrievers'];

  #alertsIndexPattern?: string;
  #anonymizationFields?: AnonymizationFieldResponse[];
  #end?: DateMath | null;
  #esClient: ElasticsearchClient;
  #filter?: Record<string, unknown> | null;
  #onNewReplacements?: (newReplacements: Replacements) => void;
  #replacements?: Replacements;
  #size?: number;
  #start?: DateMath | null;

  constructor({
    alertsIndexPattern,
    anonymizationFields,
    fields,
    end,
    esClient,
    filter,
    onNewReplacements,
    replacements,
    size,
    start,
  }: {
    alertsIndexPattern?: string;
    anonymizationFields?: AnonymizationFieldResponse[];
    end?: DateMath | null;
    esClient: ElasticsearchClient;
    fields?: CustomRetrieverInput;
    filter?: Record<string, unknown> | null;
    onNewReplacements?: (newReplacements: Replacements) => void;
    replacements?: Replacements;
    size?: number;
    start?: DateMath | null;
  }) {
    super(fields);

    this.#alertsIndexPattern = alertsIndexPattern;
    this.#anonymizationFields = anonymizationFields;
    this.#end = end;
    this.#esClient = esClient;
    this.#filter = filter;
    this.#onNewReplacements = onNewReplacements;
    this.#replacements = replacements;
    this.#size = size;
    this.#start = start;
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const anonymizedAlerts = await getAnonymizedAlerts({
      alertsIndexPattern: this.#alertsIndexPattern,
      anonymizationFields: this.#anonymizationFields,
      end: this.#end,
      esClient: this.#esClient,
      filter: this.#filter,
      onNewReplacements: this.#onNewReplacements,
      replacements: this.#replacements,
      size: this.#size,
      start: this.#start,
    });

    return anonymizedAlerts.map((alert) => ({
      pageContent: alert,
      metadata: {},
    }));
  }
}
