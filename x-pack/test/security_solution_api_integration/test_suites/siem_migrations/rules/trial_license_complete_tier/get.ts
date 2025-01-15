/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import {
  createMigrationRulesFromSavedObjects,
  deleteAllMigrationRules,
  getMigrationRuleSavedObject,
  migrationRulesRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = migrationRulesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Get API', () => {
    beforeEach(async () => {
      await deleteAllMigrationRules(es);
    });

    it('should fetch existing rules within specified migration', async () => {
      // create a document
      const migrationId = uuidv4();
      const migrationRuleSO = getMigrationRuleSavedObject({ migration_id: migrationId });
      await createMigrationRulesFromSavedObjects(es, [migrationRuleSO]);

      const { '@timestamp': timestamp, updated_at: updatedAt, ...rest } = migrationRuleSO;

      // fetch migration rule
      const response = await migrationRulesRoutes.get(migrationId);
      expect(response.body.total).toEqual(1);
      expect(response.body.data).toEqual(expect.arrayContaining([expect.objectContaining(rest)]));
    });
  });
};
