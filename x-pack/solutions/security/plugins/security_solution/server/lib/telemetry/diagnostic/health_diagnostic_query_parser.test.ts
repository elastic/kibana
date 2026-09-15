/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseHealthDiagnosticQueries } from './health_diagnostic_query_parser';
import {
  QueryType,
  Action,
  type ParseFailureQuery,
  type IndexQuery,
  type ApiQuery,
} from './health_diagnostic_service.types';

const V1_NO_VERSION_YAML = `---
id: q1
name: my-v1-query
index: logs-endpoint.*
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;

const V1_EXPLICIT_YAML = `---
version: 1
id: q1
name: my-v1-query
index: logs-endpoint.*
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;

const V2_YAML = `---
version: 2
id: q2
name: my-v2-query
integrations: 'endpoint.*,fleet_server'
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;

const UNKNOWN_VERSION_YAML = `---
version: 99
id: q-future
name: future-query
someNewField: something`;

describe('parseHealthDiagnosticQueries', () => {
  describe('v1 parsing', () => {
    test.each([
      ['no version field (legacy)', V1_NO_VERSION_YAML],
      ['explicit version: 1', V1_EXPLICIT_YAML],
    ])('parses as v1 — %s', (_label, yaml) => {
      const queries = parseHealthDiagnosticQueries(yaml);
      const q = queries[0] as IndexQuery;
      expect(q.kind).toBe('index');
      expect(q.index).toBe('logs-endpoint.*');
      expect(q.id).toBe('q1');
      expect(q.type).toBe(QueryType.DSL);
      expect(q.filterlist).toEqual({ 'user.name': Action.KEEP });
    });

    it('returns ParseFailureQuery when v1 descriptor is missing required index field', () => {
      const yaml = `---
id: bad
name: bad
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
      expect((q as ParseFailureQuery).id).toBe('bad');
    });

    it('strips integrations from a v1 descriptor — index-only result', () => {
      const yaml = `---
id: q1
name: my-v1-query
index: logs-endpoint.*
integrations: endpoint
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml) as IndexQuery[];
      expect(q.kind).toBe('index');
      expect(q.index).toBe('logs-endpoint.*');
      expect(q.integrations).toBeUndefined();
    });

    it('returns ParseFailureQuery for v1 descriptor with integrations but no index', () => {
      const yaml = `---
id: q-bad
name: bad
integrations: endpoint
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
    });

    it('returns ParseFailureQuery when v1 descriptor is missing the enabled field', () => {
      const yaml = `---
id: no-enabled
name: no-enabled
index: logs-endpoint.*
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
      expect((q as ParseFailureQuery).id).toBe('no-enabled');
    });
  });

  describe('v2 parsing', () => {
    it('parses a descriptor with version: 2 as v2', () => {
      const queries = parseHealthDiagnosticQueries(V2_YAML);
      const q = queries[0] as IndexQuery;
      expect(q.kind).toBe('index');
      expect(q.integrations).toEqual(['endpoint.*', 'fleet_server']);
      expect(q.id).toBe('q2');
    });

    it('returns ParseFailureQuery when neither integrations nor index is present', () => {
      const yaml = `---
version: 2
id: bad-v2
name: bad-v2
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
    });
  });

  describe('v2 with index', () => {
    it('parses successfully when index is present and integrations is absent', () => {
      const yaml = `---
version: 2
id: q2-index
name: my-v2-index-query
index: logs-test-*
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      const v2 = q as IndexQuery;
      expect(v2.kind).toBe('index');
      expect(v2.index).toBe('logs-test-*');
      expect(v2.integrations).toBeUndefined();
      expect(v2.datastreamTypes).toBeUndefined();
    });

    it('returns ParseFailureQuery when both integrations and index are present', () => {
      const yaml = `---
version: 2
id: bad-both
name: bad-both
integrations: 'endpoint.*'
index: logs-test-*
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
      expect((q as ParseFailureQuery).id).toBe('bad-both');
    });

    it('returns ParseFailureQuery when neither integrations nor index is present (explicit)', () => {
      const yaml = `---
version: 2
id: bad-neither
name: bad-neither
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
      expect((q as ParseFailureQuery).id).toBe('bad-neither');
    });
  });

  describe('types field', () => {
    it('parses a comma-separated datastreamTypes string into an array', () => {
      const yaml = `---
version: 2
id: q-types
name: q-types
integrations: 'endpoint.*'
datastreamTypes: 'logs,metrics.*'
type: DSL
query: '{"query": {"match_all": {}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      const v2 = q as IndexQuery;
      expect(v2.kind).toBe('index');
      expect(v2.datastreamTypes).toEqual(['logs', 'metrics.*']);
    });

    it('leaves types undefined when the field is absent', () => {
      const [q] = parseHealthDiagnosticQueries(V2_YAML);
      const v2 = q as IndexQuery;
      expect(v2.datastreamTypes).toBeUndefined();
    });

    it('returns ParseFailureQuery when datastreamTypes is a number', () => {
      const yaml = `
id: q1
name: q1
version: 2
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true
integrations: endpoint
datastreamTypes: 42`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
    });

    it('returns ParseFailureQuery when datastreamTypes is a YAML list', () => {
      const yaml = `
id: q1
name: q1
version: 2
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true
integrations: endpoint
datastreamTypes:
  - logs
  - metrics`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
    });

    it('returns ParseFailureQuery when datastreamTypes is an empty string', () => {
      const yaml = `
id: q1
name: q1
version: 2
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true
integrations: endpoint
datastreamTypes: ''`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
    });

    it('does not leak datastreamTypes on index-based path', () => {
      const yaml = `
id: q1
name: q1
version: 2
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true
index: logs-test-*
datastreamTypes: logs`;
      const [q] = parseHealthDiagnosticQueries(yaml) as IndexQuery[];
      expect('datastreamTypes' in q).toBe(false);
    });
  });

  describe('invalid type enum', () => {
    it('returns ParseFailureQuery for v1 descriptor with invalid type', () => {
      const yaml = `
id: q1
name: q1
index: logs-endpoint.*
type: foo
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      expect((parseHealthDiagnosticQueries(yaml)[0] as ParseFailureQuery)._raw).toBeDefined();
    });

    it('returns ParseFailureQuery for v2 descriptor with invalid type', () => {
      const yaml = `
id: q1
name: q1
version: 2
integrations: endpoint
type: foo
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      expect((parseHealthDiagnosticQueries(yaml)[0] as ParseFailureQuery)._raw).toBeDefined();
    });
  });

  describe('invalid filterlist', () => {
    it('returns ParseFailureQuery when filterlist is an array', () => {
      const yaml = `
id: q1
name: q1
index: logs-endpoint.*
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  - keep
enabled: true`;
      expect((parseHealthDiagnosticQueries(yaml)[0] as ParseFailureQuery)._raw).toBeDefined();
    });

    it('returns ParseFailureQuery when filterlist contains an invalid action value', () => {
      const yaml = `
id: q1
name: q1
index: logs-endpoint.*
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: badvalue
enabled: true`;
      expect((parseHealthDiagnosticQueries(yaml)[0] as ParseFailureQuery)._raw).toBeDefined();
    });
  });

  describe('invalid integrations', () => {
    it('returns ParseFailureQuery when integrations normalises to empty array', () => {
      const yaml = `
id: q1
name: q1
version: 2
integrations: ' , '
type: DSL
query: '{"query":{"match_all":{}}}'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      expect((parseHealthDiagnosticQueries(yaml)[0] as ParseFailureQuery)._raw).toBeDefined();
    });
  });

  describe('parseHealthDiagnosticQueries — v3', () => {
    const validApiYaml = `
id: transform-stats
name: transform_stats
version: 3
type: API
api: _transform/{transform_id}/_stats
pathParams:
  transform_id: "*"
responsePath: transforms
scheduleCron: 1h
enabled: true
filterlist: {}
`;

    it('parses a valid v3 API query', () => {
      const result = parseHealthDiagnosticQueries(validApiYaml);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        kind: 'api',
        api: '_transform/{transform_id}/_stats',
        responsePath: 'transforms',
        enabled: true,
      });
      expect('_raw' in result[0]).toBe(false);
    });

    it('parses successfully when responsePath is absent (uses response root)', () => {
      const yaml = validApiYaml.replace('responsePath: transforms\n', '');
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(false);
      expect(result[0]).toMatchObject({ kind: 'api' });
      expect((result[0] as { responsePath?: string }).responsePath).toBeUndefined();
    });

    it('returns ParseFailureQuery when a forbidden index field is present', () => {
      const yaml = `${validApiYaml}index: .alerts-*\n`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('returns ParseFailureQuery when tiers is present on an API query', () => {
      const yaml = `${validApiYaml}tiers:\n  - hot\n`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('returns ParseFailureQuery for unknown type value at version 3', () => {
      const yaml = validApiYaml.replace('type: API', 'type: UNKNOWN');
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('parses v3 DSL query as HealthDiagnosticQueryV2-compatible', () => {
      const yaml = `
id: some-dsl
name: some_dsl
version: 3
type: DSL
query: '{"match_all": {}}'
index: .alerts-*
scheduleCron: 1h
enabled: true
filterlist: {}
`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ type: 'DSL', index: '.alerts-*' });
      expect('_raw' in result[0]).toBe(false);
    });

    it('returns ParseFailureQuery for v3 DSL with api field present', () => {
      const yaml = `
id: bad
name: bad
version: 3
type: DSL
query: '{"match_all": {}}'
index: .alerts-*
api: _transform/_stats
scheduleCron: 1h
enabled: true
filterlist: {}
`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect('_raw' in result[0]).toBe(true);
    });

    it('exposes pathParams on a v3 API query', () => {
      const result = parseHealthDiagnosticQueries(validApiYaml);
      const q = result[0] as ApiQuery;
      expect(q.pathParams).toEqual({ transform_id: '*' });
    });

    it('returns ParseFailureQuery when api has a placeholder but pathParams is absent', () => {
      const yaml = validApiYaml.replace('pathParams:\n  transform_id: "*"\n', '');
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('returns ParseFailureQuery when api placeholder has no matching pathParams key', () => {
      const yaml = validApiYaml.replace(
        'pathParams:\n  transform_id: "*"',
        'pathParams:\n  transformId: "*"'
      );
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('returns ParseFailureQuery when only some placeholders are covered', () => {
      const yaml = `
id: nodes-stats
name: nodes_stats
version: 3
type: API
api: _nodes/{node_id}/stats/{metric}
pathParams:
  node_id: "*"
scheduleCron: 1h
enabled: true
filterlist: {}
`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(true);
    });

    it('parses successfully when api has no placeholders and pathParams is absent', () => {
      const yaml = `
id: cat-tasks
name: cat_tasks
version: 3
type: API
api: _cat/tasks
scheduleCron: 1h
enabled: true
filterlist: {}
`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(false);
      expect(result[0]).toMatchObject({ kind: 'api', api: '_cat/tasks' });
    });

    it('parses successfully when all placeholders are covered by pathParams', () => {
      const yaml = `
id: nodes-stats
name: nodes_stats
version: 3
type: API
api: _nodes/{node_id}/stats/{metric}
pathParams:
  node_id: "*"
  metric: "jvm"
scheduleCron: 1h
enabled: true
filterlist: {}
`;
      const result = parseHealthDiagnosticQueries(yaml);
      expect(result).toHaveLength(1);
      expect('_raw' in result[0]).toBe(false);
      expect(result[0]).toMatchObject({
        kind: 'api',
        pathParams: { node_id: '*', metric: 'jvm' },
      });
    });

    describe('integrations normalization on v3 API queries', () => {
      const baseYaml = `
id: transform-stats
name: transform_stats
version: 3
type: API
api: _cat/tasks
scheduleCron: 1h
enabled: true
filterlist: {}
`;

      it('parses integrations as an array when authored as a YAML sequence', () => {
        const yaml = `${baseYaml}integrations:\n  - endpoint\n  - fleet_server\n`;
        const [q] = parseHealthDiagnosticQueries(yaml) as ApiQuery[];
        expect(q.integrations).toEqual(['endpoint', 'fleet_server']);
      });

      it('parses integrations as an array when authored as a comma-separated scalar', () => {
        const yaml = `${baseYaml}integrations: endpoint,fleet_server\n`;
        const [q] = parseHealthDiagnosticQueries(yaml) as ApiQuery[];
        expect(q.integrations).toEqual(['endpoint', 'fleet_server']);
      });

      it('trims whitespace around comma-separated entries', () => {
        const yaml = `${baseYaml}integrations: " endpoint , fleet_server "\n`;
        const [q] = parseHealthDiagnosticQueries(yaml) as ApiQuery[];
        expect(q.integrations).toEqual(['endpoint', 'fleet_server']);
      });

      it('leaves integrations undefined when the field is absent', () => {
        const [q] = parseHealthDiagnosticQueries(baseYaml) as ApiQuery[];
        expect(q.integrations).toBeUndefined();
      });

      it('treats empty integrations YAML sequence as no constraint (integrations undefined)', () => {
        const yaml = `${baseYaml}integrations: []\n`;
        const [q] = parseHealthDiagnosticQueries(yaml) as ApiQuery[];
        expect('_raw' in q).toBe(false);
        expect(q.integrations).toBeUndefined();
      });

      it('treats empty integrations scalar string as no constraint (integrations undefined)', () => {
        const yaml = `${baseYaml}integrations: ""\n`;
        const [q] = parseHealthDiagnosticQueries(yaml) as ApiQuery[];
        expect('_raw' in q).toBe(false);
        expect(q.integrations).toBeUndefined();
      });

      it('returns ParseFailureQuery when integrations is an invalid type', () => {
        const yaml = `${baseYaml}integrations:\n  nested: value\n`;
        const [q] = parseHealthDiagnosticQueries(yaml);
        expect('_raw' in q).toBe(true);
      });
    });
  });

  describe('unknown version', () => {
    it('returns ParseFailureQuery for an unrecognised version', () => {
      const [q] = parseHealthDiagnosticQueries(UNKNOWN_VERSION_YAML);
      expect((q as ParseFailureQuery)._raw).toBeDefined();
      expect((q as ParseFailureQuery).id).toBe('q-future');
    });

    it('marks unrecognised version with failureReason unknown_version', () => {
      const [q] = parseHealthDiagnosticQueries(UNKNOWN_VERSION_YAML);
      expect((q as ParseFailureQuery).failureReason).toBe('unknown_version');
    });

    it('marks malformed known-version descriptor with failureReason invalid_descriptor', () => {
      const yaml = `---
id: bad
name: bad
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep`;
      const [q] = parseHealthDiagnosticQueries(yaml);
      expect((q as ParseFailureQuery).failureReason).toBe('invalid_descriptor');
    });
  });

  describe('multi-document artifact', () => {
    it('parses multiple YAML documents, each independently', () => {
      const multiDoc = [V1_NO_VERSION_YAML, V2_YAML, UNKNOWN_VERSION_YAML].join('\n');
      const queries = parseHealthDiagnosticQueries(multiDoc);
      expect(queries).toHaveLength(3);
      expect((queries[0] as IndexQuery).kind).toBe('index');
      expect((queries[1] as IndexQuery).kind).toBe('index');
      expect((queries[2] as ParseFailureQuery)._raw).toBeDefined();
    });

    it('a malformed document becomes ParseFailureQuery without dropping others', () => {
      const goodDoc = `---
id: good
name: good
index: logs-*
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep
enabled: true`;
      const badDoc = `---
version: 2
id: bad
name: bad
type: DSL
query: 'x'
scheduleCron: 5m
filterlist:
  user.name: keep`;
      const queries = parseHealthDiagnosticQueries(`${goodDoc}\n${badDoc}`);
      expect(queries).toHaveLength(2);
      expect((queries[0] as IndexQuery).kind).toBe('index');
      expect((queries[1] as ParseFailureQuery)._raw).toBeDefined();
    });
  });
});

describe('v4 encryptDocument', () => {
  it('parses a valid v4 index descriptor with encryptDocument and no filterlist', () => {
    const yaml = [
      'version: 4',
      'id: doc-enc-query',
      'name: Doc Enc Query',
      'type: DSL',
      'query: \'{"match_all":{}}\'',
      "scheduleCron: '0 */1 * * *'",
      'enabled: true',
      'integrations: endpoint',
      'encryptionKeyId: rsa-key-v1',
      'encryptDocument: true',
    ].join('\n');
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({
      kind: 'index',
      id: 'doc-enc-query',
      encryptDocument: true,
      encryptionKeyId: 'rsa-key-v1',
      filterlist: {},
    });
  });

  it('parses a valid v4 index descriptor with keep and mask filterlist', () => {
    const yaml = [
      'version: 4',
      'id: doc-enc-query',
      'name: Doc Enc Query',
      'type: DSL',
      'query: \'{"match_all":{}}\'',
      "scheduleCron: '0 */1 * * *'",
      'enabled: true',
      'integrations: endpoint',
      'encryptionKeyId: rsa-key-v1',
      'encryptDocument: true',
      'filterlist:',
      '  process.name: keep',
      '  host.ip: mask',
    ].join('\n');
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({
      kind: 'index',
      encryptDocument: true,
      filterlist: { 'process.name': Action.KEEP, 'host.ip': Action.MASK },
    });
  });

  it('produces invalid_descriptor when encryptDocument is true and encryptionKeyId is absent', () => {
    const yaml = [
      'version: 4',
      'id: bad-query',
      'name: Bad',
      'type: DSL',
      'query: \'{"match_all":{}}\'',
      "scheduleCron: '0 */1 * * *'",
      'enabled: true',
      'integrations: endpoint',
      'encryptDocument: true',
    ].join('\n');
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect((result as ParseFailureQuery).failureReason).toBe('invalid_descriptor');
  });

  it('produces invalid_descriptor when filterlist contains encrypt action', () => {
    const yaml = [
      'version: 4',
      'id: bad-query',
      'name: Bad',
      'type: DSL',
      'query: \'{"match_all":{}}\'',
      "scheduleCron: '0 */1 * * *'",
      'enabled: true',
      'integrations: endpoint',
      'encryptionKeyId: rsa-key-v1',
      'encryptDocument: true',
      'filterlist:',
      '  process.name: encrypt',
    ].join('\n');
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect((result as ParseFailureQuery).failureReason).toBe('invalid_descriptor');
  });

  it('does NOT produce unknown_version for version 4', () => {
    const yaml = [
      'version: 4',
      'id: q',
      'name: Q',
      'type: DSL',
      'query: \'{"match_all":{}}\'',
      "scheduleCron: '0 */1 * * *'",
      'enabled: true',
      'integrations: endpoint',
      'encryptionKeyId: rsa-key-v1',
      'encryptDocument: true',
    ].join('\n');
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({ kind: 'index' });
  });
});

describe('expiresAt', () => {
  const v4BaseYaml = [
    'version: 4',
    'id: q',
    'name: Q',
    'type: DSL',
    'query: \'{"match_all":{}}\'',
    "scheduleCron: '0 */1 * * *'",
    'enabled: true',
    'index: logs-*',
  ].join('\n');

  const v3BaseYaml = `${v4BaseYaml.replace('version: 4', 'version: 3')}\nfilterlist: {}`;

  it('parses a valid expiresAt date string on v4', () => {
    const yaml = `${v4BaseYaml}\nexpiresAt: '2099-12-31'`;
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({ kind: 'index', expiresAt: '2099-12-31' });
  });

  it('leaves expiresAt undefined when absent on v4', () => {
    const [result] = parseHealthDiagnosticQueries(v4BaseYaml);
    expect(result).toMatchObject({ kind: 'index' });
    expect((result as { expiresAt?: string }).expiresAt).toBeUndefined();
  });

  it('produces invalid_descriptor for a non-date expiresAt value', () => {
    const yaml = `${v4BaseYaml}\nexpiresAt: 'not-a-date'`;
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect((result as ParseFailureQuery).failureReason).toBe('invalid_descriptor');
  });

  it('accepts an ISO datetime string by truncating to the date part', () => {
    const yaml = `${v4BaseYaml}\nexpiresAt: '2099-12-31T23:59:59Z'`;
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({ kind: 'index', expiresAt: '2099-12-31' });
  });

  it('accepts an unquoted YAML date (parsed as Date object by the YAML library)', () => {
    const yaml = `${v4BaseYaml}\nexpiresAt: 2099-12-31`;
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect(result).toMatchObject({ kind: 'index', expiresAt: '2099-12-31' });
  });

  it('produces invalid_descriptor when expiresAt is used on a v3 descriptor', () => {
    const yaml = `${v3BaseYaml}\nexpiresAt: '2099-12-31'`;
    const [result] = parseHealthDiagnosticQueries(yaml);
    expect((result as ParseFailureQuery).failureReason).toBe('invalid_descriptor');
  });
});
