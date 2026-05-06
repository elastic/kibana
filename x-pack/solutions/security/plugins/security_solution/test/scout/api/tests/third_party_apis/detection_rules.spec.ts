/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, THIRD_PARTY_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface RelatedIntegration {
  package: string;
  version?: string;
  integration?: string;
}

interface MitreTactic {
  id: string;
  name: string;
  reference?: string;
}

interface MitreTechnique {
  id: string;
  name: string;
  reference?: string;
  subtechnique?: Array<{
    id: string;
    name: string;
    reference?: string;
  }>;
}

interface MitreThreat {
  framework: string;
  tactic: MitreTactic;
  technique?: MitreTechnique[];
}

interface DetectionRule {
  id: string;
  name: string;
  enabled: boolean;
  related_integrations?: RelatedIntegration[];
  threat?: MitreThreat[];
  index?: string | string[];
}

/**
 * Third-Party API Contract Tests: Detection Engine Rules
 *
 * These tests verify that the Detection Engine API returns the expected structure
 * that SIEM Readiness depends on. If Detection Engine team changes their API,
 * these tests will fail and alert us before production breaks.
 *
 * SIEM Readiness uses this API for:
 * - MITRE ATT&CK coverage calculation (Coverage tab)
 * - Integration-to-rule mapping via related_integrations
 * - Identifying rules with missing data based on index patterns
 */
apiTest.describe(
  'Third-Party API Contract - Detection Engine Rules',
  { tag: SIEM_READINESS_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };
    });

    apiTest(
      'GET /api/detection_engine/rules/_find returns expected structure',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${THIRD_PARTY_ROUTES.DETECTION_RULES_FIND}?per_page=10`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(200);

        // Response must have data array and pagination info
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);

        expect(response.body.page).toBeDefined();
        expect(response.body.perPage).toBeDefined();
        expect(response.body.total).toBeDefined();
      }
    );

    apiTest('rules have required base fields', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${THIRD_PARTY_ROUTES.DETECTION_RULES_FIND}?per_page=10`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(200);

      // Verify structure of each rule (forEach on empty array is a no-op)
      response.body.data.forEach((rule: DetectionRule) => {
        // Required fields for SIEM Readiness
        expect(rule.id).toBeDefined();
        expect(typeof rule.id).toBe('string');

        expect(rule.name).toBeDefined();
        expect(typeof rule.name).toBe('string');

        // enabled field is critical for coverage calculation
        expect(rule.enabled).toBeDefined();
        expect(typeof rule.enabled).toBe('boolean');
      });
    });

    apiTest(
      'rules with related_integrations have expected structure for integration mapping',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${THIRD_PARTY_ROUTES.DETECTION_RULES_FIND}?per_page=100`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(200);

        // Find rules that have related_integrations and flatten to integrations
        // SIEM Readiness uses this to map rules to Fleet integrations
        const allIntegrations = response.body.data
          .filter(
            (rule: DetectionRule) =>
              rule.related_integrations !== undefined && rule.related_integrations.length > 0
          )
          .flatMap((rule: DetectionRule) => rule.related_integrations ?? []);

        allIntegrations.forEach((ri: RelatedIntegration) => {
          // package is required - used to match with Fleet packages
          expect(ri.package).toBeDefined();
          expect(typeof ri.package).toBe('string');

          // version and integration are optional - no conditional type checks needed
        });
      }
    );

    apiTest(
      'rules with threat array have MITRE ATT&CK structure for coverage calculation',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${THIRD_PARTY_ROUTES.DETECTION_RULES_FIND}?per_page=100`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );

        expect(response.statusCode).toBe(200);

        // Find rules that have threat metadata (MITRE ATT&CK) and flatten to threats
        // SIEM Readiness uses this for tactic coverage calculation
        const allThreats = response.body.data
          .filter((rule: DetectionRule) => rule.threat !== undefined && rule.threat.length > 0)
          .flatMap((rule: DetectionRule) => rule.threat ?? []);

        allThreats.forEach((threat: MitreThreat) => {
          // framework is required
          expect(threat.framework).toBeDefined();
          expect(typeof threat.framework).toBe('string');

          // tactic is required and has specific structure
          expect(threat.tactic).toBeDefined();
          expect(threat.tactic.id).toBeDefined();
          expect(typeof threat.tactic.id).toBe('string');
          expect(threat.tactic.name).toBeDefined();
          expect(typeof threat.tactic.name).toBe('string');

          // technique is optional - forEach on undefined/empty is handled
          const techniques = threat.technique ?? [];
          techniques.forEach((tech: MitreTechnique) => {
            expect(tech.id).toBeDefined();
            expect(typeof tech.id).toBe('string');
            expect(tech.name).toBeDefined();
            expect(typeof tech.name).toBe('string');

            // subtechnique is optional - forEach on undefined/empty is handled
            const subtechniques = tech.subtechnique ?? [];
            subtechniques.forEach((sub) => {
              expect(sub.id).toBeDefined();
              expect(typeof sub.id).toBe('string');
              expect(sub.name).toBeDefined();
              expect(typeof sub.name).toBe('string');
            });
          });
        });
      }
    );

    apiTest('rules have index field for data presence checks', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${THIRD_PARTY_ROUTES.DETECTION_RULES_FIND}?per_page=50`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(200);

      // Find rules that have index patterns
      // SIEM Readiness uses this to check if rule data exists
      const rulesWithIndex = response.body.data.filter(
        (rule: DetectionRule) => rule.index !== undefined
      );

      rulesWithIndex.forEach((rule: DetectionRule) => {
        // index can be string or string array - normalize to array and check each
        const indices = Array.isArray(rule.index) ? rule.index : [rule.index];
        indices.forEach((idx: string | undefined) => {
          expect(typeof idx).toBe('string');
        });
      });
    });
  }
);
