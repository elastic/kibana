/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ExternalEvent,
  ExternalEventInput,
  GetEventsParams,
  ExternalAlertDocument,
} from '../../../common/types/events';
import {
  EXTERNAL_ALERTS_INDEX,
  externalEventToAlertDocument,
  alertDocumentToExternalEvent,
} from '../../../common/types/events';

export class EventsService {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Creates the index template for external alerts if it doesn't exist
   */
  private async ensureIndexTemplate(): Promise<void> {
    const templateName = 'external-alerts-template';

    try {
      const exists = await this.esClient.indices.existsIndexTemplate({ name: templateName });
      if (exists) {
        return;
      }

      await this.esClient.indices.putIndexTemplate({
        name: templateName,
        index_patterns: ['.alerts-external*'],
        priority: 100,
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            'index.mapping.total_fields.limit': 2000,
          },
          mappings: {
            dynamic: 'false',
            properties: {
              '@timestamp': { type: 'date' },
              'kibana.alert.uuid': { type: 'keyword' },
              'kibana.alert.rule.name': { type: 'keyword' },
              'kibana.alert.reason': { type: 'text' },
              'kibana.alert.status': { type: 'keyword' },
              'kibana.alert.severity': { type: 'keyword' },
              'kibana.alert.start': { type: 'date' },
              'kibana.alert.source': { type: 'keyword' },
              'kibana.alert.connector_id': { type: 'keyword' },
              'kibana.alert.raw_payload': { type: 'flattened' },
              'kibana.alert.external_url': { type: 'keyword' },
              'kibana.alert.rule.uuid': { type: 'keyword' },
              'kibana.alert.rule.category': { type: 'keyword' },
              'kibana.alert.rule.producer': { type: 'keyword' },
              'kibana.alert.rule.consumer': { type: 'keyword' },
              'kibana.alert.rule.type_id': { type: 'keyword' },
              'kibana.alert.instance.id': { type: 'keyword' },
              'kibana.space_ids': { type: 'keyword' },
              tags: { type: 'keyword' },
              'event.action': { type: 'keyword' },
              'event.kind': { type: 'keyword' },
            },
          },
        },
      });
    } catch (error) {
      // Ignore template creation errors - index will still work with dynamic mapping
    }
  }

  async createEvent(input: ExternalEventInput): Promise<ExternalEvent> {
    await this.ensureIndexTemplate();

    const event: ExternalEvent = {
      id: uuidv4(),
      title: input.title,
      message: input.message,
      severity: input.severity,
      source: input.source,
      timestamp: input.timestamp || new Date().toISOString(),
      status: input.status || 'open',
      tags: input.tags || [],
      links: input.links,
      raw_payload: input.raw_payload,
      connector_id: input.connector_id,
    };

    // Convert to Kibana alert document format
    const alertDoc = externalEventToAlertDocument(event);

    await this.esClient.index({
      index: EXTERNAL_ALERTS_INDEX,
      id: event.id,
      document: alertDoc,
      refresh: true,
    });

    return event;
  }

  async createEvents(inputs: ExternalEventInput[]): Promise<ExternalEvent[]> {
    await this.ensureIndexTemplate();

    const events: ExternalEvent[] = inputs.map((input) => ({
      id: uuidv4(),
      title: input.title,
      message: input.message,
      severity: input.severity,
      source: input.source,
      timestamp: input.timestamp || new Date().toISOString(),
      status: input.status || 'open',
      tags: input.tags || [],
      links: input.links,
      raw_payload: input.raw_payload,
      connector_id: input.connector_id,
    }));

    if (events.length === 0) {
      return [];
    }

    // Convert to Kibana alert document format
    const body = events.flatMap((event) => {
      const alertDoc = externalEventToAlertDocument(event);
      return [{ index: { _index: EXTERNAL_ALERTS_INDEX, _id: event.id } }, alertDoc];
    });

    await this.esClient.bulk({ body, refresh: true });

    return events;
  }

  async getEvents(
    params: GetEventsParams = {}
  ): Promise<{ events: ExternalEvent[]; total: number }> {
    const { from, to, source, severity, status, size = 100 } = params;

    const must: Array<Record<string, unknown>> = [];

    if (from || to) {
      must.push({
        range: {
          '@timestamp': {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        },
      });
    }

    if (source) {
      must.push({ term: { 'kibana.alert.source': source } });
    }

    if (severity) {
      must.push({ term: { 'kibana.alert.severity': severity } });
    }

    if (status) {
      // Map external status to Kibana alert status
      const kibanaStatus = status === 'resolved' ? 'recovered' : 'active';
      must.push({ term: { 'kibana.alert.status': kibanaStatus } });
    }

    try {
      const response = await this.esClient.search<ExternalAlertDocument>({
        index: EXTERNAL_ALERTS_INDEX,
        size,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      });

      const events = response.hits.hits.map((hit) =>
        alertDocumentToExternalEvent(hit._source as ExternalAlertDocument)
      );
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return { events, total };
    } catch (error: unknown) {
      // If index doesn't exist yet, return empty results
      if (
        error &&
        typeof error === 'object' &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        return { events: [], total: 0 };
      }
      throw error;
    }
  }

  async deleteAllEvents(): Promise<void> {
    try {
      await this.esClient.deleteByQuery({
        index: EXTERNAL_ALERTS_INDEX,
        query: { match_all: {} },
        refresh: true,
      });
    } catch (error: unknown) {
      // Ignore if index doesn't exist
      if (
        error &&
        typeof error === 'object' &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
      ) {
        return;
      }
      throw error;
    }
  }
}
