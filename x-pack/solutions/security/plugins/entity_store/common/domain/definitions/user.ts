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
import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';

export const userEntityDefinition: EntityDefinitionWithoutId = {
  type: 'user',
  name: `Security 'user' Entity Store Definition`,
  identityField: {
    // TODO the filter is very complex right now. Can we simplify it?
    requiresOneOfFields: [
      'user.email',
      'user.id',
      'user.name',
      'client.user.email',
      'source.user.email',
    ],
    euidFields: [
      [{ field: 'user.email' }, { separator: '@' }, { field: 'entity.namespace' }],
      [{ field: 'user.id' }, { separator: '@' }, { field: 'entity.namespace' }],
      // TODO  ADD user.domain IS NOT NULL AND namespace == "entityanalytics_ad": entity_key = "{user.name}@{user.domain}@active_directory"
      [{ field: 'user.name' }, { separator: '@' }, { field: 'entity.namespace' }],
      [{ field: 'client.user.email' }, { separator: '@' }, { field: 'entity.namespace' }],
      [{ field: 'source.user.email' }, { separator: '@' }, { field: 'entity.namespace' }],
    ],
    fieldEvaluations: [
      {
        destination: 'entity.namespace',
        source: 'event.module',
        rules: [
          { when: 'one_of', in: ['okta', 'entityanalytics_okta'], then: 'okta' },
          { when: 'one_of', in: ['azure', 'entityanalytics_entra_id'], then: 'entra_id' },
          { when: 'one_of', in: ['o365', 'o365_metrics'], then: 'microsoft_365' },
          { when: 'one_of', in: ['entityanalytics_ad'], then: 'active_directory' },
          { when: 'else', copyValueFrom: 'source' },
        ],
      },
    ],
    /**
     * UEBA user documents filter: only documents that are either
     * (A) event.kind == "asset" with at least one of user.email/user.id/user.name not empty, or
     * (B) event.category contains "iam", event.type in ("user","creation","deletion","group"),
     *     same user-identity present, and event.kind != "enrichment".
     */
    documentsFilter: {
      or: [
        {
          and: [
            { field: 'event.kind', eq: 'asset' },
            {
              or: [
                isNotEmptyCondition('user.email'),
                isNotEmptyCondition('user.id'),
                isNotEmptyCondition('user.name'),
              ],
            },
          ],
        },
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
            {
              or: [
                isNotEmptyCondition('user.email'),
                isNotEmptyCondition('user.id'),
                isNotEmptyCondition('user.name'),
              ],
            },
            { field: 'event.kind', neq: 'enrichment' },
          ],
        },
      ],
    },
  },
  entityTypeFallback: 'Identity',
  indexPatterns: [],
  fields: [
    newestValue({ destination: 'entity.name', source: 'user.name' }),
    oldestValue({ source: 'user.entity.id' }),

    collect({ source: 'event.module' }),
    collect({ source: 'event.kind' }),
    collect({ source: 'event.category' }),
    collect({ source: 'event.type' }),

    collect({ source: 'client.user.email' }),
    collect({ source: 'source.user.email' }),

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
