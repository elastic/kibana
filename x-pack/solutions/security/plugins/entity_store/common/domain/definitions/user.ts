/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { recentData } from './esql';
import { collectValues as collect, newestValue } from './field_retention_operations';

export const userEntityDefinition: EntityDefinitionWithoutId = {
  type: 'user',
  name: `Security 'user' Entity Store Definition`,
  identityField: {
    fieldEvaluations: [
      {
        destination: 'entity.namespace',
        sources: [
          { field: 'event.module' },
          { firstChunkOfField: 'data_stream.dataset', splitBy: '.' },
        ],
        fallbackValue: 'unknown',
        whenClauses: [
          { sourceMatchesAny: ['okta', 'entityanalytics_okta'], then: 'okta' },
          { sourceMatchesAny: ['azure', 'entityanalytics_entra_id'], then: 'entra_id' },
          { sourceMatchesAny: ['o365', 'o365_metrics'], then: 'microsoft_365' },
          { sourceMatchesAny: ['entityanalytics_ad'], then: 'active_directory' },
        ],
      },
    ],
    // Ranking mechanism for the identity field
    euidFields: [
      [{ field: 'user.email' }, { sep: '@' }, { field: 'entity.namespace' }],
      [{ field: 'user.id' }, { sep: '@' }, { field: 'entity.namespace' }],
      [
        { field: 'user.name' },
        { sep: '@' },
        { field: 'user.domain' },
        { sep: '@' },
        { field: 'entity.namespace' },
      ],
      [{ field: 'user.name' }, { sep: '@' }, { field: 'entity.namespace' }],
    ],
    /**
     * UEBA user documents filter (pre-aggregation: which documents enter the pipeline).
     */
    documentsFilter: {
      and: [
        // exclude failure outcomes
        {
          or: [
            { field: 'event.outcome', exists: false },
            { field: 'event.outcome', neq: 'failure' },
          ],
        },

        // exclude enrichment kind (allow missing event.kind so iam/asset docs without it pass)
        {
          or: [
            { field: 'event.kind', exists: false },
            { field: 'event.kind', neq: 'enrichment' },
          ],
        },

        // contains at least one of the id fields
        {
          or: [
            isNotEmptyCondition('user.email'),
            isNotEmptyCondition('user.id'),
            isNotEmptyCondition('user.name'),
          ],
        },
      ],
    },
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
  /**
   * Post-aggregation filter (after LOOKUP JOIN): keep row if already in entity store or IDP-like.
   */
  postAggFilter: {
    or: [
      // If entity.id exists after look up join, data is already in the entity store
      // Meaning an IDP-like event has already been processed.
      // Any other event after creation can be used as *enrichment* (idp or not).
      { field: 'entity.id', exists: true },

      // --- The below filters are the definition of an IDP-like events ---

      // or recent data (not stored) is asset kind (use includes to allow multiple values; CCS can ingest multiple values)
      { field: recentData('event.kind'), includes: 'asset' },

      // or recent data (not stored) is iam category of type user, creation, deletion, or group
      {
        and: [
          { field: recentData('event.category'), includes: 'iam' },
          {
            or: [
              { field: recentData('event.type'), includes: 'user' },
              { field: recentData('event.type'), includes: 'creation' },
              { field: recentData('event.type'), includes: 'deletion' },
              { field: recentData('event.type'), includes: 'group' },
            ],
          },
        ],
      },
    ],
  },
  fields: [
    newestValue({ destination: 'entity.name', source: 'user.name' }),

    // Having multiple values in event.module or data_stream.dataset is a good feature
    // but causes complexity for CCS extraction.
    // That's why event.module and data_stream.dataset always use MV_FIRST on its usage
    collect({ source: 'event.module' }),
    // keep field length large for safety to not lose idps
    // with many datasets
    collect({ source: 'data_stream.dataset', fieldHistoryLength: 50 }),

    collect({ source: 'event.kind' }),
    collect({ source: 'event.category' }),
    collect({ source: 'event.type' }),
    collect({ source: 'event.outcome' }),

    newestValue({ source: 'entity.namespace' }),

    collect({ source: 'user.domain' }),
    collect({ source: 'user.email' }),
    collect({ source: 'user.name' }),
    collect({
      source: 'user.full_name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'user.hash' }),
    collect({ source: 'user.id' }),
    collect({ source: 'user.roles' }),
    collect({ source: 'user.group.domain' }),
    collect({ source: 'user.group.id' }),
    collect({ source: 'user.group.name' }),
    ...getCommonFieldDescriptions('user'),
    ...getEntityFieldsDescriptions('user'),

    /* Used to populate the identity field */
    collect({ source: 'host.entity.id' }),
    collect({ source: 'host.id' }),
    collect({ source: 'host.name' }),
  ],
} as const satisfies EntityDefinitionWithoutId;
