/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import type { Client } from '@elastic/elasticsearch';
import { JsonObject, JsonArray } from '@kbn/utility-types';

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

/**
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.12/search-fields.html#docvalue-fields
 * Use the docvalue_fields parameter to get values for selected fields.
 * This can be a good choice when returning a fairly small number of fields that support doc values,
 * such as keywords and dates.
 */
export const getDocValueFields = (): JsonArray => [
  {
    field: '@timestamp',
  },
  {
    field: 'agent.ephemeral_id',
  },
  {
    field: 'agent.id',
  },
  {
    field: 'agent.name',
  },
  {
    field: 'agent.type',
  },
  {
    field: 'agent.version',
  },
  {
    field: 'as.number',
  },
  {
    field: 'as.organization.name',
  },
  {
    field: 'client.address',
  },
  {
    field: 'client.as.number',
  },
  {
    field: 'client.as.organization.name',
  },
  {
    field: 'client.bytes',
    format: 'bytes',
  },
  {
    field: 'client.domain',
  },
  {
    field: 'client.geo.city_name',
  },
  {
    field: 'client.geo.continent_name',
  },
  {
    field: 'client.geo.country_iso_code',
  },
  {
    field: 'client.geo.country_name',
  },
  {
    field: 'client.geo.location',
  },
  {
    field: 'client.geo.name',
  },
  {
    field: 'client.geo.region_iso_code',
  },
  {
    field: 'client.geo.region_name',
  },
  {
    field: 'client.ip',
  },
  {
    field: 'client.mac',
  },
  {
    field: 'client.nat.ip',
  },
  {
    field: 'client.nat.port',
    format: 'string',
  },
  {
    field: 'client.packets',
  },
  {
    field: 'client.port',
    format: 'string',
  },
  {
    field: 'client.registered_domain',
  },
  {
    field: 'client.top_level_domain',
  },
  {
    field: 'client.user.domain',
  },
  {
    field: 'client.user.email',
  },
  {
    field: 'client.user.full_name',
  },
  {
    field: 'client.user.group.domain',
  },
  {
    field: 'client.user.group.id',
  },
  {
    field: 'client.user.group.name',
  },
  {
    field: 'client.user.hash',
  },
  {
    field: 'client.user.id',
  },
  {
    field: 'client.user.name',
  },
  {
    field: 'cloud.account.id',
  },
  {
    field: 'cloud.availability_zone',
  },
  {
    field: 'cloud.instance.id',
  },
  {
    field: 'cloud.instance.name',
  },
  {
    field: 'cloud.machine.type',
  },
  {
    field: 'cloud.provider',
  },
  {
    field: 'cloud.region',
  },
  {
    field: 'code_signature.exists',
  },
  {
    field: 'code_signature.status',
  },
  {
    field: 'code_signature.subject_name',
  },
  {
    field: 'code_signature.trusted',
  },
  {
    field: 'code_signature.valid',
  },
  {
    field: 'container.id',
  },
  {
    field: 'container.image.name',
  },
  {
    field: 'container.image.tag',
  },
  {
    field: 'container.name',
  },
  {
    field: 'container.runtime',
  },
  {
    field: 'destination.address',
  },
  {
    field: 'destination.as.number',
  },
  {
    field: 'destination.as.organization.name',
  },
  {
    field: 'destination.bytes',
    format: 'bytes',
  },
  {
    field: 'destination.domain',
  },
  {
    field: 'destination.geo.city_name',
  },
  {
    field: 'destination.geo.continent_name',
  },
  {
    field: 'destination.geo.country_iso_code',
  },
  {
    field: 'destination.geo.country_name',
  },
  {
    field: 'destination.geo.location',
  },
  {
    field: 'destination.geo.name',
  },
  {
    field: 'destination.geo.region_iso_code',
  },
  {
    field: 'destination.geo.region_name',
  },
  {
    field: 'destination.ip',
  },
  {
    field: 'destination.mac',
  },
  {
    field: 'destination.nat.ip',
  },
  {
    field: 'destination.nat.port',
    format: 'string',
  },
  {
    field: 'destination.packets',
  },
  {
    field: 'destination.port',
    format: 'string',
  },
  {
    field: 'destination.registered_domain',
  },
  {
    field: 'destination.top_level_domain',
  },
  {
    field: 'destination.user.domain',
  },
  {
    field: 'destination.user.email',
  },
  {
    field: 'destination.user.full_name',
  },
  {
    field: 'destination.user.group.domain',
  },
  {
    field: 'destination.user.group.id',
  },
  {
    field: 'destination.user.group.name',
  },
  {
    field: 'destination.user.hash',
  },
  {
    field: 'destination.user.id',
  },
  {
    field: 'destination.user.name',
  },
  {
    field: 'dll.code_signature.exists',
  },
  {
    field: 'dll.code_signature.status',
  },
  {
    field: 'dll.code_signature.subject_name',
  },
  {
    field: 'dll.code_signature.trusted',
  },
  {
    field: 'dll.code_signature.valid',
  },
  {
    field: 'dll.hash.md5',
  },
  {
    field: 'dll.hash.sha1',
  },
  {
    field: 'dll.hash.sha256',
  },
  {
    field: 'dll.hash.sha512',
  },
  {
    field: 'dll.name',
  },
  {
    field: 'dll.path',
  },
  {
    field: 'dll.pe.company',
  },
  {
    field: 'dll.pe.description',
  },
  {
    field: 'dll.pe.file_version',
  },
  {
    field: 'dll.pe.original_file_name',
  },
];
