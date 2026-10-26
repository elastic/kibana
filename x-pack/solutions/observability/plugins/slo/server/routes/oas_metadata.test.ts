/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import type {
  DefaultRouteCreateOptions,
  ServerRouteRepository,
} from '@kbn/server-route-repository-utils';
import { getSloRouteRepository } from './route';

interface MediaTypes {
  content?: Record<string, { examples?: object }>;
}

interface OperationFile {
  requestBody?: MediaTypes;
  responses?: Record<string, MediaTypes>;
}

const SHARED_SCHEMAS_FILE = path.join(__dirname, 'oas_schemas.yaml');

const readYaml = <T>(file: string): T => parse(fs.readFileSync(file, 'utf8'));

const getRouteOptions = (route: ServerRouteRepository[string]): DefaultRouteCreateOptions =>
  'options' in route ? route.options : {};

const collectRefs = (document: object): string[] =>
  Array.from(JSON.stringify(document).matchAll(/"\$ref":"([^"]+)"/g), ([, ref]) => ref);

const EXPECTED_OPERATION_IDS: Record<string, string> = {
  'POST /api/observability/slos 2023-10-31': 'createSloOp',
  'GET /api/observability/slos 2023-10-31': 'findSlosOp',
  'GET /api/observability/slos/{id} 2023-10-31': 'getSloOp',
  'PUT /api/observability/slos/{id} 2023-10-31': 'updateSloOp',
  'DELETE /api/observability/slos/{id} 2023-10-31': 'deleteSloOp',
  'POST /api/observability/slos/{id}/enable 2023-10-31': 'enableSloOp',
  'POST /api/observability/slos/{id}/disable 2023-10-31': 'disableSloOp',
  'POST /api/observability/slos/{id}/_reset 2023-10-31': 'resetSloOp',
  'GET /api/observability/slos/_definitions 2023-10-31': 'getDefinitionsOp',
  'POST /api/observability/slos/_delete_instances 2023-10-31': 'deleteSloInstancesOp',
  'POST /api/observability/slos/_bulk_purge_rollup 2023-10-31': 'deleteRollupDataOp',
  'POST /api/observability/slos/_bulk_delete 2023-10-31': 'bulkDeleteOp',
  'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31': 'bulkDeleteStatusOp',
  'POST /api/observability/slos/_bulk_snapshot 2023-10-31': 'bulkSnapshotOp',
  'GET /api/observability/slos/{id}/_snapshot 2023-10-31': 'getSnapshotOp',
};

describe('SLO routes OpenAPI metadata', () => {
  const repository: ServerRouteRepository = getSloRouteRepository();
  const documentedRoutes = Object.values(repository)
    .map((route) => ({ endpoint: route.endpoint, options: getRouteOptions(route) }))
    .filter(({ options }) => options.access !== 'internal' && !options.excludeFromOAS);

  it('documents exactly the public SLO routes with their legacy operation ids', () => {
    expect(
      Object.fromEntries(
        documentedRoutes.map(({ endpoint, options }) => [endpoint, options.operationId])
      )
    ).toEqual(EXPECTED_OPERATION_IDS);
  });

  it('tags every documented route with the slo tag', () => {
    for (const { options } of documentedRoutes) {
      expect(options.tags).toContain('oas-tag:slo');
    }
  });

  it.each(Object.keys(EXPECTED_OPERATION_IDS))('%s has a summary and a description', (endpoint) => {
    const route = documentedRoutes.find((candidate) => candidate.endpoint === endpoint);
    expect(route?.options?.summary).toEqual(expect.any(String));
    expect(route?.options?.description).toEqual(expect.any(String));
  });

  it('resolves every internal reference of the shared response schemas', () => {
    const sharedSchemas = readYaml<Record<string, object>>(SHARED_SCHEMAS_FILE);
    for (const ref of collectRefs(sharedSchemas)) {
      expect(ref).toMatch(/^#\//);
      expect(sharedSchemas).toHaveProperty([ref.slice(2)]);
    }
  });

  it.each(Object.keys(EXPECTED_OPERATION_IDS))(
    '%s has a resolvable OpenAPI operation file documenting a successful response',
    (endpoint) => {
      const route = documentedRoutes.find((candidate) => candidate.endpoint === endpoint);
      const operationFile = route?.options?.oasOperationObject?.();

      expect(typeof operationFile).toBe('string');
      if (typeof operationFile !== 'string') return;
      expect(fs.existsSync(operationFile)).toBe(true);

      const operation = readYaml<OperationFile>(operationFile);
      const sharedSchemas = readYaml<Record<string, object>>(SHARED_SCHEMAS_FILE);
      for (const ref of collectRefs(operation)) {
        const [file, pointer] = ref.split('#/');
        expect(path.resolve(path.dirname(operationFile), file)).toBe(SHARED_SCHEMAS_FILE);
        expect(sharedSchemas).toHaveProperty([pointer]);
      }
      expect(Object.keys(operation.responses ?? {})).toEqual(
        expect.arrayContaining([expect.stringMatching(/^20[04]$/)])
      );
    }
  );

  it.each(Object.keys(EXPECTED_OPERATION_IDS))(
    '%s provides examples for every documented request and response media type',
    (endpoint) => {
      const route = documentedRoutes.find((candidate) => candidate.endpoint === endpoint);
      const operationFile = route?.options?.oasOperationObject?.();
      if (typeof operationFile !== 'string') throw new Error(`${endpoint} has no operation file`);

      const { requestBody, responses = {} } = readYaml<OperationFile>(operationFile);
      // Every server-route-repository route documents a JSON request body, even without `params.body`
      expect(requestBody?.content?.['application/json']?.examples).toBeDefined();
      for (const [status, { content = {} }] of Object.entries(responses)) {
        for (const [mediaType, { examples }] of Object.entries(content)) {
          expect({ status, mediaType, examples }).toEqual({
            status,
            mediaType,
            examples: expect.any(Object),
          });
        }
      }
    }
  );
});
