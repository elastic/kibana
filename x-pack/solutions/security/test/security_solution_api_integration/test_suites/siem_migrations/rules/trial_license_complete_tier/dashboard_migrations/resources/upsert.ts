/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import {
  deleteAllDashboardMigrations,
  deleteAllLookupIndices,
  getDashboardResourcesPerMigrationFromES,
} from '../../../../utils/es_queries_dashboards';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Dashboard Migration Resources Upsert', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllLookupIndices(es);
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    describe('Lookup Resource', () => {
      it('should successfully upsert lookup resources even with capital letters', async () => {
        const lookupResources = [
          {
            type: 'lookup' as const,
            name: 'severity_lookUp',
            content: 'high,1\nmedium,2\nlow,3',
            metadata: { format: 'csv', description: 'Severity to numeric mapping' },
          },
          {
            type: 'lookup' as const,
            name: 'user_roles',
            content: 'admin,Administrator\nuser,Regular User\nguest,Guest User',
            metadata: { format: 'csv' },
          },
        ];

        const response = await dashboardMigrationRoutes.resources.upsert({
          migrationId,
          body: lookupResources,
        });

        expect(response.body).toEqual({ acknowledged: true });

        // Verify resources were stored in ES
        const esResources = await getDashboardResourcesPerMigrationFromES({
          es,
          migrationId,
        });

        expect(esResources.hits.hits.length).toBeGreaterThan(0);

        // Check that the resources contain the expected data
        const storedResources = esResources.hits.hits.map((hit: any) => hit._source);
        const lookupResourcesInES = storedResources.filter(
          (resource: any) => resource.type === 'lookup'
        );

        expect(lookupResourcesInES).toHaveLength(2);
        expect(
          lookupResourcesInES.some((resource: any) => resource.name === 'severity_lookUp')
        ).toBe(true);
        expect(lookupResourcesInES.some((resource: any) => resource.name === 'user_roles')).toBe(
          true
        );
        expect(
          lookupResourcesInES.some(
            (resource: any) => resource.content === 'lookup_default_severity-look-up'
          )
        ).toBe(true);
      });

      it('should upsert the content of lookup correctly', async () => {
        const lookupResources = [
          {
            type: 'lookup' as const,
            name: 'severity_lookUp',
            content: 'high,medium,low\n1,2,3',
            metadata: { format: 'csv', description: 'Severity to numeric mapping' },
          },
        ];

        const lookupIndexName = 'lookup_default_severity-look-up';

        const response = await dashboardMigrationRoutes.resources.upsert({
          migrationId,
          body: lookupResources,
        });

        expect(response.body).toEqual({ acknowledged: true });

        /** since we do not wait for lookups to fully index across shards. for test , we will retry a couple of times to make sure the data is fully indexed */
        await pRetry(
          async () => {
            const lookupContent = await es.search({
              index: lookupIndexName,
              size: 10,
            });
            if (lookupContent.hits.hits.length === 0) {
              throw new Error('Lookup content not found yet');
            }
          },
          { retries: 3 }
        );

        const lookupContent = await es.search({
          index: lookupIndexName,
          size: 10,
        });

        expect(lookupContent.hits.hits.length).toBe(1);
        expect(lookupContent.hits.hits[0]._source).toEqual({
          high: '1',
          medium: '2',
          low: '3',
        });
      });

      it('should raise error when upserting a lookup with invalid name', async () => {
        const lookupResources = [
          {
            type: 'lookup' as const,
            name: '-',
            content: 'high,1\nmedium,2\nlow,3',
            metadata: { format: 'csv', description: 'Severity to numeric mapping' },
          },
        ];

        const response = await dashboardMigrationRoutes.resources.upsert({
          migrationId,
          body: lookupResources,
          expectedStatusCode: 500,
        });

        expect(response.body).toEqual({
          error: 'Internal Server Error',
          message:
            'Failed to process lookups: Error: Error creating lookup index from lookup: -. It does not conform to index naming rules. No valid characters in input string',
          statusCode: 500,
        });
      });
    });

    it('should successfully upsert macro resources', async () => {
      const macroResources = [
        {
          type: 'macro' as const,
          name: 'test_macro',
          content:
            'index=security_events | eval severity=case(priority=="high", "Critical", priority=="medium", "Warning", 1=1, "Info")',
          metadata: { description: 'Test macro for severity mapping' },
        },
        {
          type: 'macro' as const,
          name: 'another_macro',
          content: 'index=* | stats count by host',
          metadata: {},
        },
      ];

      const response = await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: macroResources,
      });

      expect(response.body).toEqual({ acknowledged: true });

      // Verify resources were stored in ES
      const esResources = await getDashboardResourcesPerMigrationFromES({
        es,
        migrationId,
      });

      expect(esResources.hits.hits.length).toBeGreaterThan(0);

      // Check that the resources contain the expected data
      const storedResources = esResources.hits.hits.map((hit: any) => hit._source);
      const macroResourcesInES = storedResources.filter(
        (resource: any) => resource.type === 'macro'
      );

      expect(macroResourcesInES).toHaveLength(2);
      expect(macroResourcesInES.some((resource: any) => resource.name === 'test_macro')).toBe(true);
      expect(macroResourcesInES.some((resource: any) => resource.name === 'another_macro')).toBe(
        true
      );
    });

    it('should successfully upsert mixed macro and lookup resources', async () => {
      const mixedResources = [
        {
          type: 'macro' as const,
          name: 'security_search',
          content: 'index=security_events | search *',
          metadata: { category: 'security' },
        },
        {
          type: 'lookup' as const,
          name: 'threat_indicators',
          content: 'malware,1\nphishing,2\nbotnet,3',
          metadata: { format: 'csv', category: 'threats' },
        },
        {
          type: 'macro' as const,
          name: 'time_range',
          content: 'earliest=-24h@h latest=now',
          metadata: {},
        },
      ];

      const response = await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: mixedResources,
      });

      expect(response.body).toEqual({ acknowledged: true });

      // Verify resources were stored in ES
      const esResources = await getDashboardResourcesPerMigrationFromES({
        es,
        migrationId,
      });

      expect(esResources.hits.hits.length).toBeGreaterThan(0);

      // Check that the resources contain the expected data
      const storedResources = esResources.hits.hits.map((hit: any) => hit._source);
      const macroResourcesInES = storedResources.filter(
        (resource: any) => resource.type === 'macro'
      );
      const lookupResourcesInES = storedResources.filter(
        (resource: any) => resource.type === 'lookup'
      );

      expect(macroResourcesInES).toHaveLength(2);
      expect(lookupResourcesInES).toHaveLength(1);
      expect(macroResourcesInES.some((resource: any) => resource.name === 'security_search')).toBe(
        true
      );
      expect(macroResourcesInES.some((resource: any) => resource.name === 'time_range')).toBe(true);
      expect(
        lookupResourcesInES.some((resource: any) => resource.name === 'threat_indicators')
      ).toBe(true);
    });

    it('should return 404 when migration does not exist', async () => {
      const nonExistentMigrationId = 'non-existent-migration-id';
      const resources = [
        {
          type: 'macro' as const,
          name: 'test_macro',
          content: 'index=* | stats count',
          metadata: {},
        },
      ];

      const response = await dashboardMigrationRoutes.resources.upsert({
        migrationId: nonExistentMigrationId,
        body: resources,
        expectedStatusCode: 404,
      });

      expect(response.body).toHaveProperty(
        'message',
        `No Migration found with id: ${nonExistentMigrationId}`
      );
    });

    it('should handle empty resources array', async () => {
      const response = await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: [],
      });

      expect(response.body).toEqual({ acknowledged: true });

      // Verify no resources were stored in ES
      const esResources = await getDashboardResourcesPerMigrationFromES({
        es,
        migrationId,
      });

      expect(esResources.hits.hits.length).toBe(0);
    });

    it('should handle resources with empty content', async () => {
      const resourcesWithEmptyContent = [
        {
          type: 'macro' as const,
          name: 'empty_macro',
          content: '',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'empty_lookup',
          content: '',
          metadata: {},
        },
      ];

      const response = await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: resourcesWithEmptyContent,
      });

      expect(response.body).toEqual({ acknowledged: true });

      // Verify resources were stored in ES even with empty content
      const esResources = await getDashboardResourcesPerMigrationFromES({
        es,
        migrationId,
      });

      expect(esResources.hits.hits.length).toBeGreaterThan(0);

      const storedResources = esResources.hits.hits.map((hit: any) => hit._source);
      expect(
        storedResources.some(
          (resource: any) => resource.name === 'empty_macro' && resource.content === ''
        )
      ).toBe(true);
      expect(
        storedResources.some(
          (resource: any) => resource.name === 'empty_lookup' && resource.content === ''
        )
      ).toBe(true);
    });
  });
};
