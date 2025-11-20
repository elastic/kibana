/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import { flattenSchema, upsertRuntimeFields } from './build_ebt_data_view';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
  },
}));

describe('upsertRuntimeFields', () => {
  const url = 'http://fake_url';
  const headers = {
    Authorization: 'ApiKey abc',
    'kbn-xsrf': 'xxx',
    'Content-Type': 'application/json',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (axios.put as jest.Mock).mockResolvedValue({});
  });

  test('sends one PUT per string field with correct payload and headers', async () => {
    const fields = {
      a: 'keyword',
      'nested.b': 'long',
      'deep.x.y': 'date',
    };

    await upsertRuntimeFields(fields, url, headers);

    expect(axios.put).toHaveBeenCalledTimes(3);

    const calls = (axios.put as jest.Mock).mock.calls.map(([callUrl, payload, opts]) => ({
      callUrl,
      name: payload.name,
      type: payload.runtimeField?.type,
      opts,
    }));

    const names = new Set(calls.map((c) => c.name));
    const types = new Set(calls.map((c) => c.type));
    const urls = new Set(calls.map((c) => c.callUrl));
    const allHeadersOk = calls.every(
      (c) => JSON.stringify(c.opts?.headers) === JSON.stringify(headers)
    );

    expect(names).toEqual(new Set(['properties.a', 'properties.nested.b', 'properties.deep.x.y']));
    expect(types).toEqual(new Set(['keyword', 'long', 'date']));
    expect(urls).toEqual(new Set([url]));
    expect(allHeadersOk).toBe(true);
  });

  test('ignores non-string field values', async () => {
    const fields = {
      ok: 'ip',
      skipNull: null,
      skipObj: { t: 'keyword' },
      skipNum: 123,
    };

    await upsertRuntimeFields(fields as any, url, headers);

    expect(axios.put).toHaveBeenCalledTimes(1);
    const [callUrl, payload, opts] = (axios.put as jest.Mock).mock.calls[0];

    expect(callUrl).toBe(url);
    expect(payload).toEqual({
      name: 'properties.ok',
      runtimeField: { type: 'ip' },
    });
    expect(opts).toEqual({ headers });
  });

  test('handles dotted field names correctly', async () => {
    const fields = {
      'one.two.three': 'double',
    };

    await upsertRuntimeFields(fields, url, headers);

    const [, payload] = (axios.put as jest.Mock).mock.calls[0];
    expect(payload.name).toBe('properties.one.two.three');
    expect(payload.runtimeField.type).toBe('double');
  });

  describe('flattenSchema ', () => {
    test('flattens root primitive fields', () => {
      const schema = {
        a: { type: 'keyword' },
        b: { type: 'long' },
        c: { type: 'date' },
        d: { type: 'ip' },
        e: { type: 'double' },
        f: { type: 'boolean' },
        g: { type: 'text' },
        h: { type: 'lookup' },
        i: { type: 'geo_point' },
        j: { type: 'composite' },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        a: 'keyword',
        b: 'long',
        c: 'date',
        d: 'ip',
        e: 'double',
        f: 'boolean',
        g: 'text',
        h: 'lookup',
        i: 'geo_point',
        j: 'composite',
      });
    });

    test('flattens nested objects via properties', () => {
      const schema = {
        parent: {
          properties: {
            child: { type: 'ip' },
            inner: {
              properties: {
                leaf: { type: 'double' },
                flag: { type: 'boolean' },
              },
            },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'parent.child': 'ip',
        'parent.inner.leaf': 'double',
        'parent.inner.flag': 'boolean',
      });
    });

    test('handles object node without "properties" but with nested shape', () => {
      const schema = {
        abc: {
          foo: { type: 'keyword' },
          bar: {
            baz: { type: 'long' },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'abc.foo': 'keyword',
        'abc.bar.baz': 'long',
      });
    });

    test('when node has type and properties, type takes precedence and children are not expanded', () => {
      const schema = {
        node: {
          type: 'keyword',
          properties: {
            x: { type: 'long' },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        node: 'keyword',
      });
    });

    test('deeply nested mixed primitives and objects', () => {
      const schema = {
        root: {
          properties: {
            a: { type: 'keyword' },
            obj: {
              properties: {
                b: { type: 'long' },
                c: { type: 'text' },
                d: {
                  properties: {
                    e: { type: 'date' },
                  },
                },
              },
            },
          },
        },
        lone: { type: 'ip' },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'root.a': 'keyword',
        'root.obj.b': 'long',
        'root.obj.c': 'text',
        'root.obj.d.e': 'date',
        lone: 'ip',
      });
    });

    test('ignores non-object or null schema nodes', () => {
      const schema = {
        a: null,
        b: 42,
        c: 'str',
        d: undefined,
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({});
    });

    test('array of primitive types maps to item type', () => {
      const schema = {
        tags: { type: 'array', items: { type: 'keyword' } },
        counts: { type: 'array', items: { type: 'long' } },
        dates: { type: 'array', items: { type: 'date' } },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        tags: 'keyword',
        counts: 'long',
        dates: 'date',
      });
    });

    test('array of objects flattens item properties with parent prefix', () => {
      const schema = {
        rules: {
          type: 'array',
          items: {
            properties: {
              name: { type: 'keyword' },
              score: { type: 'integer' },
              meta: {
                properties: {
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'rules.name': 'keyword',
        'rules.score': 'integer',
        'rules.meta.enabled': 'boolean',
      });
    });

    test('array without items is emitted as array', () => {
      const schema = {
        unknown: { type: 'array' },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        unknown: 'array',
      });
    });

    test('array with unknown item shape is emitted as array', () => {
      const schema = {
        misc: { type: 'array', items: {} },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        misc: 'array',
      });
    });

    test('nested arrays: array of objects containing array of primitives', () => {
      const schema = {
        groups: {
          type: 'array',
          items: {
            properties: {
              ids: { type: 'array', items: { type: 'long' } },
              labels: { type: 'array', items: { type: 'keyword' } },
            },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'groups.ids': 'long',
        'groups.labels': 'keyword',
      });
    });

    test('deeply nested arrays in objects and objects in arrays', () => {
      const schema = {
        container: {
          properties: {
            matrix: { type: 'array', items: { type: 'array', items: { type: 'double' } } },
            wrappers: {
              type: 'array',
              items: {
                properties: {
                  item: {
                    properties: {
                      values: { type: 'array', items: { type: 'ip' } },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'container.matrix': 'array',
        'container.wrappers.item.values': 'ip',
      });
    });

    test('mixed: object properties and arrays coexist', () => {
      const schema = {
        user: {
          properties: {
            name: { type: 'keyword' },
            roles: { type: 'array', items: { type: 'keyword' } },
            sessions: {
              type: 'array',
              items: {
                properties: {
                  started_at: { type: 'date' },
                  device: { type: 'text' },
                },
              },
            },
          },
        },
      };

      const out = flattenSchema(schema);

      expect(out).toEqual({
        'user.name': 'keyword',
        'user.roles': 'keyword',
        'user.sessions.started_at': 'date',
        'user.sessions.device': 'text',
      });
    });
  });
});
