/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildConnectorIdFilter } from './filtering_configs';

describe('filtering configs', () => {
  describe('buildConnectorIdFilter', () => {
    it('should return [] if called with []', () => {
      const result = buildConnectorIdFilter([]);
      expect(result).toEqual([]);
    });

    it('should match snapshot', () => {
      const result = buildConnectorIdFilter(['my-connector']);

      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "meta": Object {
              "disabled": false,
              "index": ".alerts-security.attack.discovery.alerts",
              "key": "kibana.alert.attack_discovery.api_config.name",
              "type": "term",
            },
            "query": Object {
              "terms": Object {
                "kibana.alert.attack_discovery.api_config.name": Array [
                  "my-connector",
                ],
              },
            },
          },
        ]
      `);
    });
  });
});
