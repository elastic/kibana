/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_CRITICALITY_MAPPINGS_VERSIONS, assetCriticalityFieldMap } from './constants';

describe('asset criticality - constants', () => {
  it("please bump 'ASSET_CRITICALITY_MAPPINGS_VERSIONS' when mappings change", () => {
    expect(ASSET_CRITICALITY_MAPPINGS_VERSIONS).toEqual(4);
    expect(assetCriticalityFieldMap).toMatchInlineSnapshot(`
      Object {
        "@timestamp": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "asset.criticality": Object {
          "array": false,
          "required": true,
          "type": "keyword",
        },
        "criticality_level": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "entity.asset.criticality": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "entity.id": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "event.ingested": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "host.asset.criticality": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "id_field": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "id_value": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.asset.criticality": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "updated_at": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "user.asset.criticality": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
      }
    `);
  });
});
