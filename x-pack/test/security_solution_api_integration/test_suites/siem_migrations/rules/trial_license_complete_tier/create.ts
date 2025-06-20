/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRuleMigrations, ruleMigrationRouteHelpersFactory } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Create API', () => {
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
    });

    describe('Happy path', () => {
      it('should create migrations without any issues', async () => {
        const name = 'creation test migration name';
        const {
          body: { migration_id: migrationId },
        } = await ruleMigrationRoutes.create({ body: { name } });

        expect(migrationId).not.toBeNull();

        const { body } = await ruleMigrationRoutes.get({
          migrationId,
        });

        expect(body.id).toBe(migrationId);
        expect(body.name).toBe(name);
        expect(body.created_by).not.toBeNull();
      });
    });
  });
};
