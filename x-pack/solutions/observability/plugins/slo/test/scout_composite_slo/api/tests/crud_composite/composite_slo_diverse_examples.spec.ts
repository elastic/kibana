/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { CreateCompositeSLOInput } from '@kbn/slo-schema';
import { apiTest, DEFAULT_COMPOSITE_SLO, mergeSloApiHeaders } from '../../fixtures';

/**
 * Tests that exercise a wide variety of realistic composite SLO configurations.
 * Each example represents a different real-world use case to ensure the API
 * handles diverse definitions correctly.
 */
apiTest.describe(
  'Composite SLO - Diverse Examples',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    const createAndVerify = async (
      apiClient: { post: Function; get: Function },
      input: CreateCompositeSLOInput,
      assertions: (body: Record<string, unknown>) => void
    ) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: input,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);

      const createdId = (createRes.body as Record<string, unknown>).id as string;
      const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(200);

      assertions(getRes.body as Record<string, unknown>);
    };

    apiTest(
      'Platform Availability: 2-service equal-weight composite (99.9% target)',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Platform Availability',
            description: 'Overall platform uptime across auth and api services',
            members: [
              { sloId: 'auth-service-availability', weight: 1 },
              { sloId: 'api-gateway-availability', weight: 1 },
            ],
            objective: { target: 0.999 },
            timeWindow: { duration: '30d', type: 'rolling' as const },
            tags: ['platform', 'availability', 'critical'],
          },
          (body) => {
            expect(body.name).toBe('Platform Availability');
            expect(body.objective).toStrictEqual({ target: 0.999 });
            const tw = body.timeWindow as Record<string, unknown>;
            expect(tw.duration).toBe('30d');
            expect(body.tags).toStrictEqual(['platform', 'availability', 'critical']);
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest(
      'Checkout Flow: 4-service weighted composite (critical path heavier)',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Checkout Flow Health',
            description: 'End-to-end checkout reliability with payment weighted highest',
            members: [
              { sloId: 'cart-service', weight: 2 },
              { sloId: 'payment-service', weight: 5 },
              { sloId: 'inventory-service', weight: 3 },
              { sloId: 'notification-service', weight: 1 },
            ],
            objective: { target: 0.995 },
            timeWindow: { duration: '7d', type: 'rolling' as const },
            tags: ['checkout', 'e-commerce', 'tier-0'],
          },
          (body) => {
            expect(body.name).toBe('Checkout Flow Health');
            const members = body.members as Array<unknown>;
            expect(members).toBeDefined();
            expect(body.objective).toStrictEqual({ target: 0.995 });
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest(
      'Multi-Region: grouped SLO members with instanceId per region',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Multi-Region API Latency',
            description: 'API latency SLO across US and EU regions',
            members: [
              { sloId: 'api-latency', weight: 3, instanceId: 'us-east-1' },
              { sloId: 'api-latency', weight: 3, instanceId: 'us-west-2' },
              { sloId: 'api-latency', weight: 2, instanceId: 'eu-west-1' },
              { sloId: 'api-latency', weight: 1, instanceId: 'ap-southeast-1' },
            ],
            objective: { target: 0.99 },
            timeWindow: { duration: '7d', type: 'rolling' as const },
            tags: ['multi-region', 'latency'],
          },
          (body) => {
            expect(body.name).toBe('Multi-Region API Latency');
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest(
      'Microservices Mesh: 10-service composite with diverse weights',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Microservices Mesh Health',
            description: 'Overall health of the microservices mesh',
            members: [
              { sloId: 'user-service', weight: 5 },
              { sloId: 'order-service', weight: 5 },
              { sloId: 'product-catalog', weight: 4 },
              { sloId: 'search-service', weight: 3 },
              { sloId: 'recommendation-engine', weight: 2 },
              { sloId: 'email-service', weight: 1 },
              { sloId: 'analytics-service', weight: 1 },
              { sloId: 'logging-service', weight: 1 },
              { sloId: 'config-service', weight: 2 },
              { sloId: 'cdn-service', weight: 3 },
            ],
            objective: { target: 0.98 },
            timeWindow: { duration: '30d', type: 'rolling' as const },
            tags: ['microservices', 'mesh', 'engineering'],
          },
          (body) => {
            expect(body.name).toBe('Microservices Mesh Health');
            expect(body.objective).toStrictEqual({ target: 0.98 });
            const tw = body.timeWindow as Record<string, unknown>;
            expect(tw.duration).toBe('30d');
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest('Data Pipeline: 3-stage pipeline with increasing weights', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Data Pipeline Reliability',
          description: 'Ingestion → Processing → Delivery pipeline health',
          members: [
            { sloId: 'data-ingestion', weight: 3 },
            { sloId: 'data-processing', weight: 5 },
            { sloId: 'data-delivery', weight: 8 },
          ],
          objective: { target: 0.99 },
          timeWindow: { duration: '7d', type: 'rolling' as const },
          tags: ['data-pipeline', 'backend'],
        },
        (body) => {
          expect(body.name).toBe('Data Pipeline Reliability');
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest(
      'Infrastructure: equal-weight for core infrastructure services',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Core Infrastructure',
            description: 'Core infrastructure services availability',
            members: [
              { sloId: 'dns-resolution', weight: 1 },
              { sloId: 'load-balancer', weight: 1 },
              { sloId: 'database-cluster', weight: 1 },
              { sloId: 'cache-layer', weight: 1 },
              { sloId: 'message-queue', weight: 1 },
            ],
            objective: { target: 0.9999 },
            timeWindow: { duration: '90d', type: 'rolling' as const },
            tags: ['infrastructure', 'core', 'sre'],
          },
          (body) => {
            expect(body.name).toBe('Core Infrastructure');
            expect(body.objective).toStrictEqual({ target: 0.9999 });
            const tw = body.timeWindow as Record<string, unknown>;
            expect(tw.duration).toBe('90d');
            expect(body.tags).toStrictEqual(['infrastructure', 'core', 'sre']);
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest('Mobile Backend: API + Push + Analytics with tiered weights', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Mobile Backend Health',
          description: 'Backend services health for mobile applications',
          members: [
            { sloId: 'mobile-api', weight: 10 },
            { sloId: 'push-notification', weight: 3 },
            { sloId: 'mobile-analytics', weight: 1 },
          ],
          objective: { target: 0.995 },
          timeWindow: { duration: '7d', type: 'rolling' as const },
          tags: ['mobile', 'backend'],
        },
        (body) => {
          expect(body.name).toBe('Mobile Backend Health');
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest('Customer Tier: per-customer-tier grouped SLO instances', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Customer Tier Composite',
          description: 'SLO per customer tier weighted by revenue impact',
          members: [
            { sloId: 'api-availability', weight: 10, instanceId: 'enterprise' },
            { sloId: 'api-availability', weight: 5, instanceId: 'professional' },
            { sloId: 'api-availability', weight: 2, instanceId: 'starter' },
            { sloId: 'api-availability', weight: 1, instanceId: 'free' },
          ],
          objective: { target: 0.99 },
          timeWindow: { duration: '30d', type: 'rolling' as const },
          tags: ['customer-tier', 'revenue'],
        },
        (body) => {
          expect(body.name).toBe('Customer Tier Composite');
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest('Disabled Composite: created in disabled state', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Disabled Draft Composite',
          description: 'A composite SLO created as disabled for later activation',
          members: [
            { sloId: 'draft-slo-1', weight: 1 },
            { sloId: 'draft-slo-2', weight: 1 },
          ],
          objective: { target: 0.95 },
          enabled: false,
          tags: ['draft', 'disabled'],
        },
        (body) => {
          expect(body.name).toBe('Disabled Draft Composite');
          expect(body.enabled).toBe(false);
          expect(body.tags).toStrictEqual(['draft', 'disabled']);
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest(
      'Lenient Composite: low target (90%) for development environment',
      async ({ apiClient }) => {
        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Dev Environment Health',
            description: 'Lower SLO target for development environment services',
            members: [
              { sloId: 'dev-api-svc', weight: 1 },
              { sloId: 'dev-database-svc', weight: 1 },
              { sloId: 'dev-cache-svc', weight: 1 },
            ],
            objective: { target: 0.9 },
            timeWindow: { duration: '7d', type: 'rolling' as const },
            tags: ['development', 'non-critical'],
          },
          (body) => {
            expect(body.name).toBe('Dev Environment Health');
            expect(body.objective).toStrictEqual({ target: 0.9 });
            expect(body.summary).toBeDefined();
          }
        );
      }
    );

    apiTest('Heavily Skewed Weights: one dominant member', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Skewed Weight Composite',
          description: 'Payment service dominates the composite SLI',
          members: [
            { sloId: 'payment-processing', weight: 100 },
            { sloId: 'receipt-generation', weight: 1 },
            { sloId: 'email-confirmation', weight: 1 },
          ],
          objective: { target: 0.999 },
          timeWindow: { duration: '7d', type: 'rolling' as const },
          tags: ['skewed', 'payment-focused'],
        },
        (body) => {
          expect(body.name).toBe('Skewed Weight Composite');
          expect(body.objective).toStrictEqual({ target: 0.999 });
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest(
      'Maximum Members (25): large composite representing a full service catalog',
      async ({ apiClient }) => {
        const serviceNames = [
          'auth-service',
          'user-profile',
          'billing-svc',
          'payment-svc',
          'order-service',
          'inventory-svc',
          'shipping-svc',
          'notification',
          'search-service',
          'recommendation',
          'analytics-svc',
          'reporting-svc',
          'logging-service',
          'monitoring-svc',
          'config-service',
          'gateway-service',
          'cdn-service',
          'media-service',
          'chat-service',
          'support-svc',
          'scheduler-svc',
          'worker-service',
          'cache-service',
          'queue-service',
          'storage-svc',
        ];

        await createAndVerify(
          apiClient,
          {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Full Service Catalog',
            description: 'All 25 services in the catalog',
            members: serviceNames.map((name, i) => ({
              sloId: `${name}-slo`,
              weight: Math.max(1, 25 - i),
            })),
            objective: { target: 0.95 },
            timeWindow: { duration: '30d', type: 'rolling' as const },
            tags: ['full-catalog', 'enterprise'],
          },
          (body) => {
            expect(body.name).toBe('Full Service Catalog');
            const summary = body.summary as Record<string, unknown>;
            expect(summary).toBeDefined();
            expect(summary.sliValue).toBeDefined();
            expect(summary.errorBudget).toBeDefined();
            expect(summary.status).toBeDefined();
          }
        );
      }
    );

    apiTest('No Tags: composite SLO with empty tags array', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Untagged Composite',
          description: 'A composite with no tags',
          members: [
            { sloId: 'untagged-1', weight: 1 },
            { sloId: 'untagged-2', weight: 1 },
          ],
          tags: [],
        },
        (body) => {
          expect(body.name).toBe('Untagged Composite');
          expect(body.tags).toStrictEqual([]);
          expect(body.summary).toBeDefined();
        }
      );
    });

    apiTest('Mixed grouped and ungrouped members', async ({ apiClient }) => {
      await createAndVerify(
        apiClient,
        {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Mixed Grouping',
          description: 'Some members are grouped (have instanceId), some are not',
          members: [
            { sloId: 'latency-slo', weight: 5, instanceId: 'host-1' },
            { sloId: 'latency-slo', weight: 5, instanceId: 'host-2' },
            { sloId: 'error-rate-slo', weight: 3 },
            { sloId: 'throughput-slo', weight: 2 },
          ],
          objective: { target: 0.99 },
          tags: ['mixed', 'grouped'],
        },
        (body) => {
          expect(body.name).toBe('Mixed Grouping');
          expect(body.summary).toBeDefined();
        }
      );
    });
  }
);
