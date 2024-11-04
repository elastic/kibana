/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function SvlEnrichPoliciesHelpers({ getService }: FtrProviderContext) {
  const es = getService('es');

  const createEnrichPolicy = async (policyName: string, indexName: string) => {
    await es.enrich.putPolicy({
      name: policyName,
      match: {
        match_field: 'email',
        enrich_fields: ['firstName'],
        indices: [indexName],
      },
    });
  };

  const createIndex = async (indexName: string) => {
    await es.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            email: {
              type: 'text',
            },
            firstName: {
              type: 'text',
            },
          },
        },
      },
    });
  };

  const deleteIndex = async (indexName: string) => {
    await es.indices.delete({ index: indexName });
  };

  return {
    createEnrichPolicy,
    createIndex,
    deleteIndex,
  };
}
