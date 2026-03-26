/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import {
  fieldNotOneOfCondition,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
  isNotEmptyCondition,
} from './common_fields';
import type { EntityDefinitionWithoutId } from './entity_schema';
import {
  ENTITY_CONFIDENCE,
  LOCAL_NAMESPACE_EXCLUDED_USER_NAMES,
  USER_ENTITY_NAMESPACE,
} from './user_entity_constants';
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

/** Shared post-LOOKUP keep: entity already in store. */
const entityIdExistsAfterLookup = { field: 'entity.id', exists: true } as const;

/** IDP: document filter (event.kind not enrichment, at least one of user.email/id/name). Reused in documentsFilter. */
const idpDocumentFilter = {
  and: [
    {
      or: [
        { field: 'event.kind', exists: false },
        { field: 'event.kind', neq: 'enrichment' },
      ],
    },
    {
      or: [
        isNotEmptyCondition('user.email'),
        isNotEmptyCondition('user.id'),
        isNotEmptyCondition('user.name'),
      ],
    },
  ],
};

const idpPostAggFilter: EntityDefinitionWithoutId['postAggFilter'] = {
  or: [
    { field: 'event.kind', includes: 'asset' },
    {
      and: [
        { field: 'event.category', includes: 'iam' },
        {
          or: [
            { field: 'event.type', includes: 'user' },
            { field: 'event.type', includes: 'creation' },
            { field: 'event.type', includes: 'deletion' },
            { field: 'event.type', includes: 'group' },
          ],
        },
      ],
    },
  ],
};

const idpEventTypeCondition = idpPostAggFilter;

const nonIdpDocumentFilter: Condition = {
  and: [
    isNotEmptyCondition('user.name'),
    isNotEmptyCondition('host.id'),
    fieldNotOneOfCondition('user.name', [...LOCAL_NAMESPACE_EXCLUDED_USER_NAMES]),
  ],
};
const nonIdpPostAggFilter = nonIdpDocumentFilter;

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
    euidRanking: {
      branches: [
        {
          when: { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
          ranking: [
            [
              { field: 'user.name' },
              { sep: '@' },
              { field: 'host.id' },
              { sep: '@' },
              { field: 'entity.namespace' },
            ],
          ],
        },
        {
          ranking: [
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
        },
      ],
    },
    /**
     * UEBA user documents filter (pre-aggregation: which documents enter the pipeline).
     * event.outcome not failure AND (idpDocumentFilter OR nonIdpDocumentFilter).
     */
    documentsFilter: {
      and: [
        {
          or: [
            { field: 'event.outcome', exists: false },
            { field: 'event.outcome', neq: 'failure' },
          ],
        },
        { or: [idpDocumentFilter, nonIdpDocumentFilter] },
      ],
    },
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
  /** Post-aggregation filter (after LOOKUP JOIN): keep row when entity.id exists (shared) OR IDP OR non-IDP. Logical field names; main logs ESQL maps STATS destinations to `recent.*`. */
  postAggFilter: { or: [entityIdExistsAfterLookup, idpPostAggFilter, nonIdpPostAggFilter] },
  /** Pre-agg: non-IDP local path sets entity.namespace + Medium confidence (before STATS / EU ID). */
  whenConditionTrueSetFieldsPreAgg: [
    {
      condition: { and: [{ not: idpEventTypeCondition }, nonIdpDocumentFilter] },
      fields: {
        'entity.namespace': USER_ENTITY_NAMESPACE.Local,
        'entity.confidence': ENTITY_CONFIDENCE.Medium,
      },
    },
  ],
  /** Post-STATS: entity.name (local: user.name@host.name when host.name present, else user.name) and High confidence when not local (logs ESQL only). */
  whenConditionTrueSetFieldsAfterStats: [
    {
      condition: {
        and: [
          { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
          isNotEmptyCondition('host.name'),
        ],
      },
      fields: {
        'entity.name': { composition: { fields: ['user.name', 'host.name'], sep: '@' } },
      },
    },
    {
      condition: {
        and: [
          { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
          { not: isNotEmptyCondition('host.name') },
        ],
      },
      fields: {
        'entity.name': { source: 'user.name' },
      },
    },
    {
      condition: { field: 'entity.namespace', neq: USER_ENTITY_NAMESPACE.Local },
      fields: {
        'entity.name': { source: 'user.name' },
        'entity.confidence': ENTITY_CONFIDENCE.High,
      },
    },
  ],
  fields: [
    newestValue({ source: 'entity.name' }),
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
    oldestValue({ source: 'entity.confidence' }),

    collect({ source: 'user.domain' }),
    collect({ source: 'user.email' }),
    newestValue({ source: 'user.name' }),
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
    newestValue({ source: 'host.name' }),
  ],
} as const satisfies EntityDefinitionWithoutId;
