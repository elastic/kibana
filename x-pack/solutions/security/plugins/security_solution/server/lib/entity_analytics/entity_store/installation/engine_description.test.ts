/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import { createEngineDescription } from './engine_description';
import { convertToEntityManagerDefinition } from '../entity_definitions/entity_manager_conversion';

describe('getUnitedEntityDefinition', () => {
  const defaultIndexPatterns = ['test*'];
  describe('host', () => {
    const description = createEngineDescription({
      entityType: 'host',
      namespace: 'test',
      requestParams: {
        fieldHistoryLength: 10,
      },
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "@timestamp": Object {
              "type": "date",
            },
            "asset.criticality": Object {
              "type": "keyword",
            },
            "entity.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "entity.source": Object {
              "type": "keyword",
            },
            "host.architecture": Object {
              "type": "keyword",
            },
            "host.domain": Object {
              "type": "keyword",
            },
            "host.hostname": Object {
              "type": "keyword",
            },
            "host.id": Object {
              "type": "keyword",
            },
            "host.ip": Object {
              "type": "ip",
            },
            "host.mac": Object {
              "type": "keyword",
            },
            "host.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "host.os.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "host.os.type": Object {
              "type": "keyword",
            },
            "host.risk.calculated_level": Object {
              "type": "keyword",
            },
            "host.risk.calculated_score": Object {
              "type": "float",
            },
            "host.risk.calculated_score_norm": Object {
              "type": "float",
            },
            "host.type": Object {
              "type": "keyword",
            },
          },
        }
      `);
    });

    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });

      expect(entityManagerDefinition).toMatchInlineSnapshot(`
        Object {
          "displayNameTemplate": "{{host.name}}",
          "id": "security_host_test",
          "identityFields": Array [
            Object {
              "field": "host.name",
              "optional": false,
            },
          ],
          "indexPatterns": Array [
            "test*",
          ],
          "latest": Object {
            "lookbackPeriod": "1d",
            "settings": Object {
              "frequency": "60s",
              "syncDelay": "60s",
              "syncField": "@timestamp",
            },
            "timestampField": "@timestamp",
          },
          "managed": true,
          "metadata": Array [
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.domain",
              "source": "host.domain",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.hostname",
              "source": "host.hostname",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.id",
              "source": "host.id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.os.name",
              "source": "host.os.name",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.os.type",
              "source": "host.os.type",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.ip",
              "source": "host.ip",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.mac",
              "source": "host.mac",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.type",
              "source": "host.type",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.architecture",
              "source": "host.architecture",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "asc",
                },
                "type": "top_value",
              },
              "destination": "entity.source",
              "source": "_index",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "asset.criticality",
              "source": "asset.criticality",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_level",
              "source": "host.risk.calculated_level",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_score",
              "source": "host.risk.calculated_score",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_score_norm",
              "source": "host.risk.calculated_score_norm",
            },
          ],
          "name": "Security 'host' Entity Store Definition",
          "type": "host",
          "version": "1.0.0",
        }
      `);
    });
  });
  describe('user', () => {
    const description = createEngineDescription({
      entityType: 'user',
      namespace: 'test',
      requestParams: {
        fieldHistoryLength: 10,
      },
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "@timestamp": Object {
              "type": "date",
            },
            "asset.criticality": Object {
              "type": "keyword",
            },
            "entity.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "entity.source": Object {
              "type": "keyword",
            },
            "user.domain": Object {
              "type": "keyword",
            },
            "user.email": Object {
              "type": "keyword",
            },
            "user.full_name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "user.hash": Object {
              "type": "keyword",
            },
            "user.id": Object {
              "type": "keyword",
            },
            "user.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "user.risk.calculated_level": Object {
              "type": "keyword",
            },
            "user.risk.calculated_score": Object {
              "type": "float",
            },
            "user.risk.calculated_score_norm": Object {
              "type": "float",
            },
            "user.roles": Object {
              "type": "keyword",
            },
          },
        }
      `);
    });
    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });
      expect(entityManagerDefinition).toMatchInlineSnapshot(`
        Object {
          "displayNameTemplate": "{{user.name}}",
          "id": "security_user_test",
          "identityFields": Array [
            Object {
              "field": "user.name",
              "optional": false,
            },
          ],
          "indexPatterns": Array [
            "test*",
          ],
          "latest": Object {
            "lookbackPeriod": "1d",
            "settings": Object {
              "frequency": "60s",
              "syncDelay": "60s",
              "syncField": "@timestamp",
            },
            "timestampField": "@timestamp",
          },
          "managed": true,
          "metadata": Array [
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.domain",
              "source": "user.domain",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.email",
              "source": "user.email",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.full_name",
              "source": "user.full_name",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.hash",
              "source": "user.hash",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.id",
              "source": "user.id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.roles",
              "source": "user.roles",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "asc",
                },
                "type": "top_value",
              },
              "destination": "entity.source",
              "source": "_index",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "asset.criticality",
              "source": "asset.criticality",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_level",
              "source": "user.risk.calculated_level",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_score",
              "source": "user.risk.calculated_score",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_score_norm",
              "source": "user.risk.calculated_score_norm",
            },
          ],
          "name": "Security 'user' Entity Store Definition",
          "type": "user",
          "version": "1.0.0",
        }
      `);
    });
  });

  describe('service', () => {
    const description = createEngineDescription({
      entityType: 'service',
      namespace: 'test',
      requestParams: {
        fieldHistoryLength: 10,
      },
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "@timestamp": Object {
              "type": "date",
            },
            "asset.criticality": Object {
              "type": "keyword",
            },
            "entity.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "entity.source": Object {
              "type": "keyword",
            },
            "service.address": Object {
              "type": "keyword",
            },
            "service.environment": Object {
              "type": "keyword",
            },
            "service.ephemeral_id": Object {
              "type": "keyword",
            },
            "service.id": Object {
              "type": "keyword",
            },
            "service.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "service.node.name": Object {
              "type": "keyword",
            },
            "service.node.role": Object {
              "type": "keyword",
            },
            "service.node.roles": Object {
              "type": "keyword",
            },
            "service.risk.calculated_level": Object {
              "type": "keyword",
            },
            "service.risk.calculated_score": Object {
              "type": "float",
            },
            "service.risk.calculated_score_norm": Object {
              "type": "float",
            },
            "service.state": Object {
              "type": "keyword",
            },
            "service.type": Object {
              "type": "keyword",
            },
            "service.version": Object {
              "type": "keyword",
            },
          },
        }
      `);
    });

    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });
      expect(entityManagerDefinition).toMatchInlineSnapshot(`
        Object {
          "displayNameTemplate": "{{service.name}}",
          "id": "security_service_test",
          "identityFields": Array [
            Object {
              "field": "service.name",
              "optional": false,
            },
          ],
          "indexPatterns": Array [
            "test*",
          ],
          "latest": Object {
            "lookbackPeriod": "1d",
            "settings": Object {
              "frequency": "60s",
              "syncDelay": "60s",
              "syncField": "@timestamp",
            },
            "timestampField": "@timestamp",
          },
          "managed": true,
          "metadata": Array [
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.address",
              "source": "service.address",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.environment",
              "source": "service.environment",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.ephemeral_id",
              "source": "service.ephemeral_id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.id",
              "source": "service.id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.node.name",
              "source": "service.node.name",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.node.roles",
              "source": "service.node.roles",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.node.role",
              "source": "service.node.role",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "service.state",
              "source": "service.state",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "service.type",
              "source": "service.type",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "service.version",
              "source": "service.version",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "asc",
                },
                "type": "top_value",
              },
              "destination": "entity.source",
              "source": "_index",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "asset.criticality",
              "source": "asset.criticality",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "service.risk.calculated_level",
              "source": "service.risk.calculated_level",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "service.risk.calculated_score",
              "source": "service.risk.calculated_score",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "service.risk.calculated_score_norm",
              "source": "service.risk.calculated_score_norm",
            },
          ],
          "name": "Security 'service' Entity Store Definition",
          "type": "service",
          "version": "1.0.0",
        }
      `);
    });
  });
});
