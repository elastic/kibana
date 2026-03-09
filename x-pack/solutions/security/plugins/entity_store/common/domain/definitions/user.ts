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
     * UEBA user documents filter
     */
    documentsFilter: {
      and: [
        {
          or: [
            isNotEmptyCondition('user.email'),
            isNotEmptyCondition('user.id'),
            isNotEmptyCondition('user.name'),
          ],
        },
        {
          or: [
            { and: [{ field: 'event.kind', eq: 'asset' }] },
            {
              and: [
                { field: 'event.category', includes: 'iam' },
                {
                  or: [
                    { field: 'event.type', eq: 'user' },
                    { field: 'event.type', eq: 'creation' },
                    { field: 'event.type', eq: 'deletion' },
                    { field: 'event.type', eq: 'group' },
                  ],
                },
                { field: 'event.kind', neq: 'enrichment' },
              ],
            },
          ],
        },
      ],
    },
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
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
