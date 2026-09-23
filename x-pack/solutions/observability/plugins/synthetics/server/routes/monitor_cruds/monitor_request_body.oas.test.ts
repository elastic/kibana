/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateOpenApiDocument } from '@kbn/router-to-openapispec';
import type { OpenAPIV3 } from 'openapi-types';
import { QuerySchema } from '../common';
import { wrapZodRequestValidation } from '../zod_query';
import { createMonitorRequestBody, editMonitorRequestBody } from './monitor_request_body';

const bodySchemaOf = (op: OpenAPIV3.OperationObject | undefined) => {
  const requestBody = op?.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  return Object.values(requestBody?.content ?? {})[0]?.schema;
};

const deref = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  components: Record<string, OpenAPIV3.SchemaObject>
): OpenAPIV3.SchemaObject | undefined => {
  if (!schema) {
    return undefined;
  }
  if ('$ref' in schema) {
    const id = schema.$ref.replace('#/components/schemas/', '');
    return components[id];
  }
  return schema;
};

const buildRouters = (routes: Array<Record<string, unknown>>) => {
  const withDefaults = routes.map((route) => ({
    isVersioned: false,
    handler: jest.fn(),
    ...route,
  }));
  return [{ getRoutes: () => withDefaults }] as unknown as Parameters<
    typeof generateOpenApiDocument
  >[0]['routers'];
};

describe('monitor request body OAS', () => {
  it('emits named components and a type discriminator mapping', async () => {
    const wrappedCreate = wrapZodRequestValidation({
      request: { body: createMonitorRequestBody },
    }).request;
    const wrappedEdit = wrapZodRequestValidation({
      request: { body: editMonitorRequestBody },
    }).request;
    const wrappedList = wrapZodRequestValidation({ request: { query: QuerySchema } }).request;

    const doc = await generateOpenApiDocument(
      {
        routers: buildRouters([
          {
            path: '/api/synthetics/monitors',
            method: 'post',
            options: { access: 'public', summary: 'Create monitor' },
            validationSchemas: { request: wrappedCreate },
          },
          {
            path: '/api/synthetics/monitors/{monitorId}',
            method: 'put',
            options: { access: 'public', summary: 'Edit monitor' },
            validationSchemas: { request: wrappedEdit },
          },
          {
            path: '/api/synthetics/monitors',
            method: 'get',
            options: { access: 'public', summary: 'List monitors' },
            validationSchemas: { request: wrappedList },
          },
        ]),
        versionedRouters: [],
      },
      { title: 'synthetics oas', version: '1.0.0', baseUrl: 'https://localhost/' }
    );

    const components = (doc.components?.schemas ?? {}) as Record<string, OpenAPIV3.SchemaObject>;
    expect(Object.keys(components).some((key) => key.startsWith('_zod_v4_'))).toBe(false);
    expect(components).toEqual(
      expect.objectContaining({
        createMonitorRequest: expect.any(Object),
        editMonitorRequest: expect.any(Object),
        httpMonitorFields: expect.any(Object),
        tcpMonitorFields: expect.any(Object),
        icmpMonitorFields: expect.any(Object),
        browserMonitorFields: expect.any(Object),
        apiMonitorFields: expect.any(Object),
        syntheticsJsonValue: expect.any(Object),
      })
    );

    expect(components.createMonitorRequest.discriminator).toEqual({
      propertyName: 'type',
      mapping: {
        http: '#/components/schemas/httpMonitorFields',
        tcp: '#/components/schemas/tcpMonitorFields',
        icmp: '#/components/schemas/icmpMonitorFields',
        browser: '#/components/schemas/browserMonitorFields',
        api: '#/components/schemas/apiMonitorFields',
      },
    });

    const createSchema = deref(
      bodySchemaOf(doc.paths['/api/synthetics/monitors']?.post),
      components
    );
    expect(createSchema?.discriminator?.propertyName).toBe('type');
    expect(createSchema?.oneOf).toHaveLength(5);

    const editSchema = deref(
      bodySchemaOf(doc.paths['/api/synthetics/monitors/{monitorId}']?.put),
      components
    );
    expect(editSchema?.type).toBe('object');
    expect(editSchema?.additionalProperties).toBe(false);
    expect(editSchema?.oneOf).toBeUndefined();
    expect(editSchema?.description).toContain('Partial monitor update');

    const tags = (doc.paths['/api/synthetics/monitors']?.get?.parameters ?? []).find(
      (parameter): parameter is OpenAPIV3.ParameterObject =>
        !('$ref' in parameter) && parameter.name === 'tags'
    );
    expect(tags?.description).toContain('string or an array');
    expect(tags?.schema).toEqual(
      expect.objectContaining({
        type: 'array',
        items: expect.objectContaining({ type: 'string' }),
      })
    );
  });
});
