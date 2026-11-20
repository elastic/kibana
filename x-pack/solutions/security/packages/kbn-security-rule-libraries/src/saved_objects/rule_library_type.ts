/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { RULE_LIBRARY_SO_TYPE } from '../constants';

const MAX_STRING = 1024;
const MAX_TEXT = 10000;
const MAX_SECRET = 16384;
const MAX_ITEMS = 100;

const str = () => schema.string({ maxLength: MAX_STRING });
const text = () => schema.string({ maxLength: MAX_TEXT });

const libraryV1 = schema.object(
  {
    name: str(),
    title: str(),
    description: schema.maybe(text()),
    images: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            src: str(),
            title: schema.maybe(str()),
            size: schema.maybe(str()),
            type: schema.maybe(str()),
          },
          { unknowns: 'allow' }
        ),
        { maxSize: MAX_ITEMS }
      )
    ),
    owner: schema.maybe(
      schema.object(
        { type: schema.maybe(str()), github: schema.maybe(str()) },
        { unknowns: 'allow' }
      )
    ),
    license: schema.maybe(str()),
    conditions: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    space_id: schema.maybe(str()),
    provider: schema.object(
      {
        type: schema.oneOf([schema.literal('fleet'), schema.literal('git'), schema.literal('s3')]),
        url: schema.maybe(str()),
        branch: schema.maybe(str()),
        region: schema.maybe(str()),
        authType: schema.maybe(
          schema.oneOf([
            schema.literal('none'),
            schema.literal('token'),
            schema.literal('basic'),
            schema.literal('ssh_key'),
            schema.literal('s3_access_key'),
          ])
        ),
        username: schema.maybe(str()),
        known_hosts: schema.maybe(text()),
      },
      { unknowns: 'allow' }
    ),
    secret: schema.maybe(schema.string({ maxLength: MAX_SECRET })),
    pinned_version: schema.maybe(str()),
    version: schema.maybe(str()),
    ref: schema.maybe(str()),
    previous_version: schema.maybe(str()),
    sync_status: schema.maybe(
      schema.oneOf([
        schema.literal('synced'),
        schema.literal('syncing'),
        schema.literal('sync_failed'),
      ])
    ),
    sync_started_at: schema.maybe(str()),
    synced_at: schema.maybe(str()),
    last_error: schema.maybe(schema.nullable(text())),
    item_count: schema.maybe(schema.number()),
  },
  { unknowns: 'allow' }
);

export const ruleLibraryType: SavedObjectsType = {
  name: RULE_LIBRARY_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: false,
  },
  mappings: {
    dynamic: false,
    properties: {
      space_id: { type: 'keyword' },
      name: { type: 'keyword' },
      provider: {
        properties: {
          type: { type: 'keyword' },
        },
      },
      version: { type: 'keyword' },
      sync_status: { type: 'keyword' },
      sync_started_at: { type: 'date' },
    },
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: libraryV1,
        create: libraryV1,
      },
    },
  },
};
