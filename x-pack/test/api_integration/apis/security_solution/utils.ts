/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Client } from '@elastic/elasticsearch';
import { JsonObject } from '@kbn/utility-types';

export async function getSavedObjectFromES<T>(
  es: Client,
  savedObjectType: string,
  query?: object
): Promise<TransportResult<estypes.SearchResponse<T>, unknown>> {
  return await es.search<T>(
    {
      index: '.kibana',
      body: {
        query: {
          bool: {
            filter: [
              { ...query },
              {
                term: {
                  type: {
                    value: savedObjectType,
                  },
                },
              },
            ],
          },
        },
      },
    },
    { meta: true }
  );
}

export const getFilterValue = (hostName: string, from: string, to: string): JsonObject => ({
  bool: {
    filter: [
      {
        bool: {
          should: [{ match_phrase: { 'host.name': hostName } }],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ range: { '@timestamp': { gte: from } } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ range: { '@timestamp': { lte: to } } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ],
  },
});

export const getFieldsToRequest = (): string[] => [
  '@timestamp',
  'message',
  'event.category',
  'event.action',
  'host.name',
  'source.ip',
  'destination.ip',
  'user.name',
  '@timestamp',
  'kibana.alert.workflow_status',
  'signal.group.id',
  'signal.original_time',
  'signal.rule.building_block_type',
  'signal.rule.filters',
  'signal.rule.from',
  'signal.rule.language',
  'signal.rule.query',
  'signal.rule.name',
  'signal.rule.to',
  'signal.rule.id',
  'signal.rule.index',
  'signal.rule.type',
  'signal.original_event.kind',
  'signal.original_event.module',
  'file.path',
  'file.Ext.code_signature.subject_name',
  'file.Ext.code_signature.trusted',
  'file.hash.sha256',
  'host.os.family',
  'event.code',
];
