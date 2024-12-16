/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import type { Document } from '@langchain/core/documents';
import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';

import { getAnonymizedAlerts } from '../helpers/get_anonymized_alerts';

export type CustomRetrieverInput = BaseRetrieverInput;

export class AnonymizedAlertsRetriever extends BaseRetriever {
  lc_namespace = ['langchain', 'retrievers'];

  #alertsIndexPattern?: string;
  #anonymizationFields?: AnonymizationFieldResponse[];
  #esClient: ElasticsearchClient;
  #onNewReplacements?: (newReplacements: Replacements) => void;
  #replacements?: Replacements;
  #size?: number;

  constructor({
    alertsIndexPattern,
    anonymizationFields,
    fields,
    esClient,
    onNewReplacements,
    replacements,
    size,
  }: {
    alertsIndexPattern?: string;
    anonymizationFields?: AnonymizationFieldResponse[];
    fields?: CustomRetrieverInput;
    esClient: ElasticsearchClient;
    onNewReplacements?: (newReplacements: Replacements) => void;
    replacements?: Replacements;
    size?: number;
  }) {
    super(fields);

    this.#alertsIndexPattern = alertsIndexPattern;
    this.#anonymizationFields = anonymizationFields;
    this.#esClient = esClient;
    this.#onNewReplacements = onNewReplacements;
    this.#replacements = replacements;
    this.#size = size;
  }

  async _getRelevantDocuments(
    query: string,
    runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const anonymizedAlerts = await getAnonymizedAlerts({
      alertsIndexPattern: this.#alertsIndexPattern,
      anonymizationFields: this.#anonymizationFields,
      esClient: this.#esClient,
      onNewReplacements: this.#onNewReplacements,
      replacements: this.#replacements,
      size: this.#size,
    });

    return anonymizedAlerts.map((alert) => ({
      pageContent: alert,
      metadata: {},
    }));
  }
}
