/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getDefaultDashboardMigrationDocumentWithOverrides } from '../../../../utils/dashboard_mocks';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import {
  deleteAllDashboardMigrations,
  indexMigrationDashboards,
} from '../../../../utils/es_queries_dashboards';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');

  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Get Dashboards API', () => {
    let migrationId: string;
    let indexedIds: string[];
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const migrationResponse = await dashboardMigrationRoutes.create({});
      migrationId = migrationResponse.body.migration_id;

      const candidateDashboard1 = getDefaultDashboardMigrationDocumentWithOverrides({
        original_dashboard: {
          title: 'Dashboard 1 - First',
          last_updated: '2023-11-09T12:00:00Z',
          splunk_properties: {
            app: 'first',
          },
        },
        elastic_dashboard: {
          id: 'some-installed-id',
        },
        status: 'completed',
        migration_id: migrationId,
        translation_result: 'full',
      });

      const candidateDashboard2 = getDefaultDashboardMigrationDocumentWithOverrides({
        original_dashboard: {
          title: 'Dashboard 2 - Second',
          last_updated: '2023-11-10T12:00:00Z',
          splunk_properties: {
            app: 'second',
          },
        },
        migration_id: migrationId,
        translation_result: 'partial',
        status: 'failed',
      });

      indexedIds = await indexMigrationDashboards(es, [candidateDashboard1, candidateDashboard2]);
    });

    it('should fetch existing rules for a given migrationId', async () => {
      const response = await dashboardMigrationRoutes.getDashboards({
        migrationId,
      });
      expect(response.body).toEqual({
        total: 2,
        data: [
          expect.objectContaining({
            original_dashboard: expect.objectContaining({
              title: 'Dashboard 1 - First',
            }),
          }),
          expect.objectContaining({
            original_dashboard: expect.objectContaining({
              title: 'Dashboard 2 - Second',
            }),
          }),
        ],
      });
    });

    describe('Filtering', () => {
      it('should filter by search term', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            search_term: 'First',
          },
        });
        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });

      it('should filter by search term failed translations', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            search_term: 'Second',
          },
        });
        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
          ],
        });
      });

      it('should filter by ids', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            ids: [indexedIds[0]],
          },
        });
        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });

      it('should filter by is_fully_translated', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            is_fully_translated: true,
          },
        });

        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });

      it('should filter by is_partially_translated', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            is_partially_translated: true,
          },
        });

        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
          ],
        });
      });

      it('should filter by installed', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            is_installed: true,
          },
        });

        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });

      it('should filter by failed', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            is_failed: true,
          },
        });

        expect(response.body).toEqual({
          total: 1,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
          ],
        });
      });

      it('should filter by `untranslatable`', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            is_untranslatable: true,
          },
        });

        expect(response.body).toEqual({
          total: 0,
          data: [],
        });
      });
    });
    describe('Sorting', () => {
      it('should sort by title asending', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            sort_field: 'original_dashboard.title',
            sort_direction: 'asc',
          },
        });

        expect(response.body).toEqual({
          total: 2,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
          ],
        });
      });

      it('should sort by title descending', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            sort_field: 'original_dashboard.title',
            sort_direction: 'desc',
          },
        });

        expect(response.body).toEqual({
          total: 2,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });

      it('should sort by splunk app correctly', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            sort_field: 'original_dashboard.splunk_properties.app',
            sort_direction: 'desc',
          },
        });

        expect(response.body).toEqual({
          total: 2,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });
    });
    describe('Pagination', () => {
      it('should paginate correctly', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            page: 1,
            per_page: 1,
            sort_field: 'original_dashboard.title',
            sort_direction: 'asc',
          },
        });

        expect(response.body).toEqual({
          total: 2,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 2 - Second',
              }),
            }),
          ],
        });
      });

      it('should return first page if only per_page is provided', async () => {
        const response = await dashboardMigrationRoutes.getDashboards({
          migrationId,
          queryParams: {
            per_page: 1,
            sort_field: 'original_dashboard.title',
            sort_direction: 'asc',
          },
        });

        expect(response.body).toEqual({
          total: 2,
          data: [
            expect.objectContaining({
              original_dashboard: expect.objectContaining({
                title: 'Dashboard 1 - First',
              }),
            }),
          ],
        });
      });
    });
  });
};
