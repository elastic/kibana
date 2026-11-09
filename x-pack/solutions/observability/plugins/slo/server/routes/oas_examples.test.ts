/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { STATUS_CODES } from 'http';
import path from 'path';
import { parse } from 'yaml';
import { z } from '@kbn/zod';
import type {
  DefaultRouteCreateOptions,
  ServerRouteRepository,
  ZodParamsObject,
} from '@kbn/server-route-repository-utils';
import { getSloRouteRepository } from './route';

interface ExampleObject {
  summary?: string;
  value?: object;
}

interface MediaTypeObject {
  schema?: { $ref?: string };
  examples?: Record<string, ExampleObject>;
}

interface ResponseObject {
  content?: Record<string, MediaTypeObject>;
}

interface ErrorSchema {
  required: string[];
  properties: Record<string, { type: string }>;
}

interface OperationFile {
  requestBody?: { content?: Record<string, MediaTypeObject> };
  responses?: Record<string, ResponseObject>;
}

const ERROR_SCHEMAS_FILE = path.join(__dirname, 'oas_error_schemas.yaml');
const IO_TS_MESSAGE = /^Invalid value .* supplied to/;

const readYaml = <T>(file: string): T => parse(fs.readFileSync(file, 'utf8'));

const getRouteOptions = (route: ServerRouteRepository[string]): DefaultRouteCreateOptions =>
  'options' in route ? route.options : {};

const readOperationFile = ({ oasOperationObject }: DefaultRouteCreateOptions): OperationFile => {
  const operationFile = oasOperationObject?.();
  if (typeof operationFile !== 'string') throw new Error('oasOperationObject has no file path');
  return readYaml<OperationFile>(operationFile);
};

const getSchemaViolations = (value: object, { required, properties }: ErrorSchema): string[] => [
  ...required.filter((key) => !(key in value)).map((key) => `missing ${key}`),
  ...Object.entries(properties)
    .filter(([key, { type }]) => key in value && typeof Reflect.get(value, key) !== type)
    .map(([key, { type }]) => `${key} is not a ${type}`),
];

const getZodParams = (route: ServerRouteRepository[string]): ZodParamsObject | undefined =>
  'params' in route && route.params instanceof z.ZodObject ? route.params : undefined;

const getQueryObject = (query?: z.core.$ZodType): z.ZodObject | undefined => {
  if (query instanceof z.ZodOptional) return getQueryObject(query.unwrap());
  return query instanceof z.ZodObject ? query : undefined;
};

const getQueryParamExamples = (params?: ZodParamsObject): Record<string, unknown> => {
  const examples: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(getQueryObject(params?.shape.query)?.shape ?? {})) {
    const inner = field instanceof z.ZodOptional ? field.unwrap() : field;
    const example = inner.meta()?.example;
    if (example !== undefined) examples[name] = example;
  }
  return examples;
};

const EXPECTED_QUERY_PARAM_EXAMPLES: Record<string, string[]> = {
  'GET /api/observability/slos 2023-10-31': [
    'filters',
    'kqlQuery',
    'page',
    'perPage',
    'sortBy',
    'sortDirection',
    'hideStale',
    'size',
  ],
  'GET /api/observability/slos/{id} 2023-10-31': ['instanceId', 'remoteName'],
  'GET /api/observability/slos/{id}/_snapshot 2023-10-31': ['at', 'instanceId'],
  'GET /api/observability/slos/_definitions 2023-10-31': [
    'search',
    'includeOutdatedOnly',
    'includeHealth',
    'tags',
    'page',
    'perPage',
  ],
};

// 4xx and 5xx codes documented per route, from `handleSLOError` and the handlers:
// 400 request validation or SLOError, 401/403 security, 404 SLONotFound (`findById`, `findAllByIds`),
// 409 SLOIdConflict (create), 503 SLOOperationTimeout (`withDeadline`: create, update and reset).
const EXPECTED_ERROR_STATUS_CODES: Record<string, string[]> = {
  'POST /api/observability/slos 2023-10-31': ['400', '401', '403', '409', '503'],
  'GET /api/observability/slos 2023-10-31': ['400', '401', '403'],
  'GET /api/observability/slos/{id} 2023-10-31': ['400', '401', '403', '404'],
  'PUT /api/observability/slos/{id} 2023-10-31': ['400', '401', '403', '404', '503'],
  'DELETE /api/observability/slos/{id} 2023-10-31': ['400', '401', '403', '404'],
  'POST /api/observability/slos/{id}/enable 2023-10-31': ['400', '401', '403', '404'],
  'POST /api/observability/slos/{id}/disable 2023-10-31': ['400', '401', '403', '404'],
  'POST /api/observability/slos/{id}/_reset 2023-10-31': ['400', '401', '403', '404', '503'],
  'GET /api/observability/slos/_definitions 2023-10-31': ['400', '401', '403'],
  'POST /api/observability/slos/_delete_instances 2023-10-31': ['400', '401', '403'],
  'POST /api/observability/slos/_bulk_purge_rollup 2023-10-31': ['400', '401', '403'],
  'POST /api/observability/slos/_bulk_delete 2023-10-31': ['400', '401', '403'],
  'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31': ['401', '403'],
  'POST /api/observability/slos/_bulk_snapshot 2023-10-31': ['400', '401', '403'],
  'GET /api/observability/slos/{id}/_snapshot 2023-10-31': ['400', '401', '403', '404'],
};

describe('SLO routes OpenAPI examples', () => {
  const documentedRoutes = Object.values(getSloRouteRepository())
    .map((route) => ({
      endpoint: route.endpoint,
      options: getRouteOptions(route),
      params: getZodParams(route),
      routeResponses: route.responses,
    }))
    .filter(({ options }) => options.access !== 'internal' && !options.excludeFromOAS);
  const errorSchemas = readYaml<Record<string, ErrorSchema>>(ERROR_SCHEMAS_FILE);

  it('documents the 4xx and 5xx codes each route can return', () => {
    expect(
      Object.fromEntries(
        documentedRoutes.map(({ endpoint, options }) => [
          endpoint,
          Object.keys(readOperationFile(options).responses ?? {}).filter((status) =>
            /^[45]/.test(status)
          ),
        ])
      )
    ).toEqual(EXPECTED_ERROR_STATUS_CODES);
  });

  describe.each(documentedRoutes)('$endpoint', ({ endpoint, options, params, routeResponses }) => {
    const { requestBody, responses = {} } = readOperationFile(options);

    it('has request body examples that parse with the route body schema', () => {
      const examples = Object.entries(requestBody?.content?.['application/json']?.examples ?? {});
      const body = params?.shape.body;
      if (!body) {
        expect(examples).toEqual([]);
        return;
      }

      expect(examples.length).toBeGreaterThan(0);
      for (const [name, { value }] of examples) {
        const result = body.safeParse(value);
        expect({ name, issues: result.error?.issues }).toEqual({ name, issues: undefined });
        // A key the schema does not know would be silently stripped, so the example must round-trip
        expect({ name, value: z.encode(body, result.data) }).toEqual({ name, value });
      }
    });

    it('has query parameter examples that parse with the route query schema', () => {
      const query = getQueryObject(params?.shape.query);
      const examples = getQueryParamExamples(params);
      if (examples && Object.keys(EXPECTED_QUERY_PARAM_EXAMPLES[endpoint] ?? []).length > 0) {
        expect(query).toBeDefined();
      }
      expect(Object.keys(examples).sort()).toEqual(
        [...(EXPECTED_QUERY_PARAM_EXAMPLES[endpoint] ?? [])].sort()
      );

      const result = query?.safeParse(examples);
      expect(result?.error?.issues).toBeUndefined();
    });

    it('has 2xx response examples that parse with the route response schema', () => {
      const successResponses = Object.entries(responses).filter(([status]) =>
        status.startsWith('2')
      );
      for (const [status, { content }] of successResponses) {
        const examples = Object.entries(content?.['application/json']?.examples ?? {});
        if (examples.length === 0) continue;

        const schema = routeResponses?.[Number(status)]?.body?.();
        if (!(schema instanceof z.ZodType)) throw new Error(`${endpoint} has no ${status} schema`);

        for (const [name, { value }] of examples) {
          const result = schema.safeParse(value);
          expect({ status, name, issues: result.error?.issues }).toEqual({
            status,
            name,
            issues: undefined,
          });
          // The example is the wire form, so encoding the parsed value must give it back
          expect({ status, name, value: z.encode(schema, result.data) }).toEqual({
            status,
            name,
            value,
          });
        }
      }
    });

    it('has 4xx and 5xx examples that match their error schema', () => {
      const errorResponses = Object.entries(responses).filter(([status]) => /^[45]/.test(status));
      for (const [status, { content }] of errorResponses) {
        const { schema, examples = {} } = content?.['application/json'] ?? {};
        expect({ status, schema }).toEqual({
          status,
          schema: { $ref: `../oas_error_schemas.yaml#/${status}_response` },
        });
        expect(Object.keys(examples).length).toBeGreaterThan(0);

        const errorSchema = errorSchemas[`${status}_response`];
        for (const [name, { value }] of Object.entries(examples)) {
          expect({
            status,
            name,
            violations: getSchemaViolations(value ?? {}, errorSchema),
          }).toEqual({
            status,
            name,
            violations: [],
          });
          expect(value).toEqual(
            expect.objectContaining({ statusCode: Number(status), error: STATUS_CODES[status] })
          );
          expect({
            name,
            ioTs: IO_TS_MESSAGE.test(String(Reflect.get(value ?? {}, 'message'))),
          }).toEqual({
            name,
            ioTs: false,
          });
        }
      }
    });
  });
});
