/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import { deleteAllDashboardMigrations } from '../../../../utils/es_queries_dashboards';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Dashboard Migration Resources Get', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should get all resources when no filters are applied', async () => {
      // First, upsert some test resources
      const testResources = [
        {
          type: 'macro' as const,
          name: 'test_macro_1',
          content: 'index=security_events | stats count',
          metadata: { category: 'security' },
        },
        {
          type: 'macro' as const,
          name: 'test_macro_2',
          content: 'index=* | search *',
          metadata: { category: 'general' },
        },
        {
          type: 'lookup' as const,
          name: 'test_lookup_1',
          content: 'high,1\nmedium,2\nlow,3',
          metadata: { format: 'csv' },
        },
        {
          type: 'lookup' as const,
          name: 'test_lookup_2',
          content: 'admin,Administrator\nuser,Regular User',
          metadata: { format: 'csv' },
        },
      ];

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Get all resources
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
      });

      expect(response.body).toHaveLength(4);

      // Verify all resources are present
      const resourceNames = response.body.map((resource: any) => resource.name);
      expect(resourceNames).toContain('test_macro_1');
      expect(resourceNames).toContain('test_macro_2');
      expect(resourceNames).toContain('test_lookup_1');
      expect(resourceNames).toContain('test_lookup_2');
    });

    it('should filter resources by type', async () => {
      // First, upsert some test resources
      const testResources = [
        {
          type: 'macro' as const,
          name: 'macro_resource',
          content: 'index=* | stats count',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'lookup_resource',
          content: 'key1,value1\nkey2,value2',
          metadata: {},
        },
      ];

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Get only macro resources
      const macroResponse = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { type: 'macro' },
      });

      expect(macroResponse.body).toHaveLength(1);
      expect(macroResponse.body[0].type).toBe('macro');
      expect(macroResponse.body[0].name).toBe('macro_resource');

      // Get only lookup resources
      const lookupResponse = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { type: 'lookup' },
      });

      expect(lookupResponse.body).toHaveLength(1);
      expect(lookupResponse.body[0].type).toBe('lookup');
      expect(lookupResponse.body[0].name).toBe('lookup_resource');
    });

    it('should filter resources by names', async () => {
      // First, upsert some test resources
      const testResources = [
        {
          type: 'macro' as const,
          name: 'security_macro',
          content: 'index=security_events | stats count',
          metadata: {},
        },
        {
          type: 'macro' as const,
          name: 'network_macro',
          content: 'index=network_events | stats count',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'severity_lookup',
          content: 'high,1\nmedium,2\nlow,3',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'user_lookup',
          content: 'admin,Administrator\nuser,Regular User',
          metadata: {},
        },
      ];

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Get specific resources by names
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { names: ['security_macro', 'severity_lookup'] },
      });

      expect(response.body).toHaveLength(2);

      const resourceNames = response.body.map((resource: any) => resource.name);
      expect(resourceNames).toContain('security_macro');
      expect(resourceNames).toContain('severity_lookup');
      expect(resourceNames).not.toContain('network_macro');
      expect(resourceNames).not.toContain('user_lookup');
    });

    it('should filter resources by both type and names', async () => {
      // First, upsert some test resources
      const testResources = [
        {
          type: 'macro' as const,
          name: 'security_macro',
          content: 'index=security_events | stats count',
          metadata: {},
        },
        {
          type: 'macro' as const,
          name: 'network_macro',
          content: 'index=network_events | stats count',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'security_lookup',
          content: 'high,1\nmedium,2\nlow,3',
          metadata: {},
        },
        {
          type: 'lookup' as const,
          name: 'network_lookup',
          content: 'internal,1\nexternal,2',
          metadata: {},
        },
      ];

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Get only macro resources with specific names
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: {
          type: 'macro',
          names: ['security_macro', 'network_macro'],
        },
      });

      expect(response.body).toHaveLength(2);

      response.body.forEach((resource: any) => {
        expect(resource.type).toBe('macro');
        expect(['security_macro', 'network_macro']).toContain(resource.name);
      });
    });

    it('should support pagination with from and size parameters', async () => {
      // First, upsert multiple test resources
      const testResources = Array.from({ length: 10 }, (_, i) => ({
        type: 'macro' as const,
        name: `macro_${i}`,
        content: `index=test_${i} | stats count`,
        metadata: { index: i },
      }));

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Get first page (first 3 resources)
      const firstPageResponse = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { from: 0, size: 3 },
      });

      expect(firstPageResponse.body).toHaveLength(3);

      // Get second page (next 3 resources)
      const secondPageResponse = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { from: 3, size: 3 },
      });

      expect(secondPageResponse.body).toHaveLength(3);

      // Verify no overlap between pages
      const firstPageNames = firstPageResponse.body.map((resource: any) => resource.name);
      const secondPageNames = secondPageResponse.body.map((resource: any) => resource.name);

      const overlap = firstPageNames.filter((name: string) => secondPageNames.includes(name));
      expect(overlap).toHaveLength(0);
    });

    it('should return empty array when no resources exist', async () => {
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
      });

      expect(response.body).toEqual([]);
    });

    it('should return empty array when filters match no resources', async () => {
      // First, upsert some test resources
      const testResources = [
        {
          type: 'macro' as const,
          name: 'test_macro',
          content: 'index=* | stats count',
          metadata: {},
        },
      ];

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: testResources,
      });

      // Try to get lookup resources (should be empty)
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { type: 'lookup' },
      });

      expect(response.body).toEqual([]);
    });

    it('should return 404 when migration does not exist', async () => {
      const nonExistentMigrationId = 'non-existent-migration-id';

      const response = await dashboardMigrationRoutes.resources.get({
        migrationId: nonExistentMigrationId,
        expectStatusCode: 404,
      });

      expect(response.body).toHaveProperty(
        'message',
        `No Migration found with id: ${nonExistentMigrationId}`
      );
    });

    it('should handle large number of resources efficiently', async () => {
      // Create a large number of resources
      const largeResourceSet = Array.from({ length: 50 }, (_, i) => ({
        type: i % 2 === 0 ? ('macro' as const) : ('lookup' as const),
        name: `resource_${i}`,
        content: i % 2 === 0 ? `index=test_${i} | stats count` : `key_${i},value_${i}`,
        metadata: { index: i },
      }));

      await dashboardMigrationRoutes.resources.upsert({
        migrationId,
        body: largeResourceSet,
      });

      // Get all resources (specify a large size to get all 50)
      const response = await dashboardMigrationRoutes.resources.get({
        migrationId,
        queryParams: { size: 100 },
      });

      expect(response.body).toHaveLength(50);

      // Verify we have the expected mix of types
      const macroCount = response.body.filter((resource: any) => resource.type === 'macro').length;
      const lookupCount = response.body.filter(
        (resource: any) => resource.type === 'lookup'
      ).length;

      expect(macroCount).toBe(25);
      expect(lookupCount).toBe(25);
    });
  });
};
