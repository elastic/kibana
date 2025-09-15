/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { riskScoreFieldMap } from '../../risk_score/configurations';
import { getDefaultRiskEngineConfiguration } from './saved_object_configuration';

describe('#getDefaultRiskEngineConfiguration', () => {
  it("please bump 'mappingsVersion' when mappings change", () => {
    const namespace = 'default';
    const config = getDefaultRiskEngineConfiguration({ namespace });

    expect(config._meta.mappingsVersion).toEqual(4);
    expect(riskScoreFieldMap).toMatchInlineSnapshot(`
      Object {
        "@timestamp": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "event.ingested": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "host.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk": Object {
          "array": false,
          "required": false,
          "type": "object",
        },
        "host.risk.calculated_level": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.calculated_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "host.risk.calculated_score_norm": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "host.risk.category_1_count": Object {
          "array": false,
          "required": false,
          "type": "long",
        },
        "host.risk.category_1_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "host.risk.id_field": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.id_value": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.inputs": Object {
          "array": true,
          "required": false,
          "type": "object",
        },
        "host.risk.inputs.category": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.inputs.description": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.inputs.id": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.inputs.index": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "host.risk.inputs.risk_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "host.risk.inputs.timestamp": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "host.risk.notes": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk": Object {
          "array": false,
          "required": false,
          "type": "object",
        },
        "service.risk.calculated_level": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.calculated_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "service.risk.calculated_score_norm": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "service.risk.category_1_count": Object {
          "array": false,
          "required": false,
          "type": "long",
        },
        "service.risk.category_1_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "service.risk.id_field": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.id_value": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.inputs": Object {
          "array": true,
          "required": false,
          "type": "object",
        },
        "service.risk.inputs.category": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.inputs.description": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.inputs.id": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.inputs.index": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "service.risk.inputs.risk_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "service.risk.inputs.timestamp": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "service.risk.notes": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.name": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk": Object {
          "array": false,
          "required": false,
          "type": "object",
        },
        "user.risk.calculated_level": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.calculated_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "user.risk.calculated_score_norm": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "user.risk.category_1_count": Object {
          "array": false,
          "required": false,
          "type": "long",
        },
        "user.risk.category_1_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "user.risk.id_field": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.id_value": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.inputs": Object {
          "array": true,
          "required": false,
          "type": "object",
        },
        "user.risk.inputs.category": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.inputs.description": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.inputs.id": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.inputs.index": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
        "user.risk.inputs.risk_score": Object {
          "array": false,
          "required": false,
          "type": "float",
        },
        "user.risk.inputs.timestamp": Object {
          "array": false,
          "required": false,
          "type": "date",
        },
        "user.risk.notes": Object {
          "array": false,
          "required": false,
          "type": "keyword",
        },
      }
    `);
  });
});
