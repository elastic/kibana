/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const resolver = getService('resolverGenerator');

  describe('Resolver handling of entity ids', () => {
    it('receives 400s for entity_ids that are empty strings', async () => {});
    it('does not find children without a process entity_id', async () => {});
    it('does not query for ancestors that have an empty string for the entity_id', async () => {});
  });
}
