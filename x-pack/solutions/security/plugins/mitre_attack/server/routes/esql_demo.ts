/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { MITRE_ATTACK_ENTITY_SO_TYPE, MITRE_ESQL_DEMO_URL } from '../../common/constants';

const querySchema = schema.object({
  query: schema.string({ minLength: 1, maxLength: 2048 }),
  size: schema.number({ defaultValue: 5, min: 1, max: 25 }),
});

// Column references are module-level constants — they are pure AST nodes with no mutable state.
const colSemanticContent = esql.col(`${MITRE_ATTACK_ENTITY_SO_TYPE}.semantic_content`);
const colName = esql.col(`${MITRE_ATTACK_ENTITY_SO_TYPE}.name`);
const colId = esql.col(`${MITRE_ATTACK_ENTITY_SO_TYPE}.id`);

export const registerEsqlDemoRoute = (
  router: IRouter<RequestHandlerContext>,
  getRepository: () => ISavedObjectsRepository | undefined
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: MITRE_ESQL_DEMO_URL,
      security: {
        authz: {
          enabled: false,
          reason: 'POC demo route — internal MITRE reference data, no user data',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { query: querySchema } },
      },
      async (_context, request, response) => {
        const repository = getRepository();
        if (!repository) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Service not yet ready' },
          });
        }

        const { query, size } = request.query;
        // LIMIT requires a literal integer; floor the validated number defensively.
        const limitVal = Math.floor(size);

        // Build the pipeline. Column references are interpolated as identifiers;
        // ${{ query }} creates a named ES|QL parameter (value sent out-of-band —
        // never string-interpolated into the query). The number literal becomes
        // an integer literal in the LIMIT clause.
        const pipeline = esql`WHERE MATCH(${colSemanticContent}, ${{
          query,
        }}) | KEEP ${colName}, ${colId} | LIMIT ${limitVal}`;

        const result = await repository.esql({
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          namespaces: ['*'],
          pipeline,
        });

        return response.ok({
          body: {
            // Print the pipeline for demo/debugging visibility (FROM clause is added server-side).
            pipeline: pipeline.print('basic'),
            columns: result.columns,
            values: result.values,
          },
        });
      }
    );
};
