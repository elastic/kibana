/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultRiskEngineConfiguration } from './saved_object_configuration';

describe('#getDefaultRiskEngineConfiguration', () => {
  it("please bump 'mappingsVersion' when mappings change", () => {
    const namespace = 'default';
    const config = getDefaultRiskEngineConfiguration({ namespace });
    expect(config).toMatchInlineSnapshot(`
      Object {
        "_meta": Object {
          "mappingsVersion": 2,
        },
        "dataViewId": ".alerts-security.alerts-default",
        "enabled": false,
        "filter": Object {},
        "identifierType": undefined,
        "interval": "1h",
        "pageSize": 3500,
        "range": Object {
          "end": "now",
          "start": "now-30d",
        },
      }
    `);
  });
});
