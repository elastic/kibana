/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { getMockQRadarXml } from '@kbn/security-solution-plugin/common/siem_migrations/parsers/qradar/mock/data';
import {
  deleteAllRuleMigrations,
  expectedQradarReferenceSets,
  qradarXmlWithReferenceSets,
  ruleMigrationResourcesRouteHelpersFactory,
  ruleMigrationRouteHelpersFactory,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);
  const migrationResourcesRoutes = ruleMigrationResourcesRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Create QRadar Rules API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      const response = await migrationRulesRoutes.create({});
      migrationId = response.body.migration_id;
    });

    describe('Happy path', () => {
      it('should create QRadar migrations and identify reference sets as missing resources', async () => {
        // Add QRadar rules with reference sets
        await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId,
          payload: {
            xml: qradarXmlWithReferenceSets,
          },
        });

        // Fetch migration rules to verify they were created
        const rulesResponse = await migrationRulesRoutes.getRules({ migrationId });
        expect(rulesResponse.body.total).toEqual(1);

        const migrationRule = rulesResponse.body.data[0];
        expect(migrationRule.original_rule.vendor).toEqual('qradar');
        expect(migrationRule.original_rule.title).toEqual('Test Rule with Reference Sets');

        // Fetch missing resources - reference sets should be identified
        const resourcesResponse = await migrationResourcesRoutes.getMissingResources({
          migrationId,
        });

        // Verify all expected reference sets are identified as missing resources
        expect(resourcesResponse.body).toEqual(expect.arrayContaining(expectedQradarReferenceSets));
        expect(resourcesResponse.body.length).toEqual(expectedQradarReferenceSets.length);
      });
    });

    describe('Error handling', () => {
      it('should return 404 if invalid migration id is provided', async () => {
        const { body } = await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId: 'non-existing-migration-id',
          payload: {
            xml: qradarXmlWithReferenceSets,
          },
          expectStatusCode: 404,
        });

        expect(body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          message: 'No Migration found with id: non-existing-migration-id',
        });
      });

      it('should return an error when xml is not provided', async () => {
        await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId,
          payload: {
            // @ts-expect-error
            xml: undefined,
          },
          expectStatusCode: 400,
        });
      });

      it('should return an error when invalid XML is provided', async () => {
        await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId,
          payload: {
            xml: 'not valid xml content',
          },
          expectStatusCode: 400,
        });
      });

      it('should not allow building block rules to be created', async () => {
        const rule1Name = 'QRadar Building Block Rule';
        const isBuildingBlockRule = true;

        const { mockQradarXml } = getMockQRadarXml([rule1Name], isBuildingBlockRule);

        const response = await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId,
          payload: {
            xml: mockQradarXml,
          },
          expectStatusCode: 400,
        });

        expect(response.body).toMatchObject({
          message: 'No valid rules could be extracted from the XML',
        });
      });

      it('should return an error when XML has no rules', async () => {
        const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><content></content>`;
        const response = await migrationRulesRoutes.addQradarRulesToMigration({
          migrationId,
          payload: { xml: emptyXml },
          expectStatusCode: 400,
        });

        expect(response.body).toMatchObject({
          message: 'No rules found in the provided XML',
        });
      });
    });
  });
};
