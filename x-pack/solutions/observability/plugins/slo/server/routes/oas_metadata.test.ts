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
  const documentedRoutes = Object.values(getSloRouteRepository())
    .map((route) => ({ endpoint: route.endpoint, options: getRouteOptions(route) }))
    .filter(({ options }) => options.access !== 'internal' && !options.excludeFromOAS);
  const sharedSchemas = readYaml<Record<string, object>>(SHARED_SCHEMAS_FILE);

  it('documents exactly the public SLO routes with their legacy operation ids', () => {
    expect(
      Object.fromEntries(
        documentedRoutes.map(({ endpoint, options }) => [endpoint, options.operationId])
      )
    ).toEqual(EXPECTED_OPERATION_IDS);
  });

  it('resolves every internal reference of the shared response schemas', () => {
    for (const ref of collectRefs(sharedSchemas)) {
      expect(ref).toMatch(/^#\//);
      expect(sharedSchemas).toHaveProperty([ref.slice(2)]);
    }
  });

  describe.each(documentedRoutes)('$endpoint', ({ options }) => {
    it('has a summary, a description and the slo tag', () => {
      expect(options).toEqual(
        expect.objectContaining({
          summary: expect.any(String),
          description: expect.any(String),
          tags: expect.arrayContaining(['oas-tag:slo']),
        })
      );
    });

    it('has an operation file with resolvable references, a successful response and examples', () => {
      const operationFile = options.oasOperationObject?.();
      if (typeof operationFile !== 'string') throw new Error('oasOperationObject has no file path');

      const operation = readYaml<OperationFile>(operationFile);
      for (const ref of collectRefs(operation)) {
        const [file, pointer] = ref.split('#/');
        expect(path.resolve(path.dirname(operationFile), file)).toBe(SHARED_SCHEMAS_FILE);
        expect(sharedSchemas).toHaveProperty([pointer]);
      }

      const { requestBody, responses = {} } = operation;
      expect(Object.keys(responses)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^20[04]$/)])
      );
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
    });
  });
});
