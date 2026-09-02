/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, ELASTIC_INTERNAL_ORIGIN_HEADER, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};

const EXPECTED_SECURITY_TRIGGER_IDS = [
  'security.alertAssigneesChanged',
  'security.alertStatusChanged',
  'security.alertTagsChanged',
  'security.attackAssigneesChanged',
  'security.attackStatusChanged',
  'security.attackTagsChanged',
  'security.noteCreated',
  'security.noteUpdated',
];

apiTest.describe(
  'Security Solution - Workflow Trigger Registration',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      headers = { ...cookieHeader, ...COMMON_HEADERS };
    });

    apiTest(
      'should register all expected Security Solution event-driven trigger definitions',
      async ({ apiClient }) => {
        const response = await apiClient.get('internal/workflows_extensions/trigger_definitions', {
          headers,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.triggers)).toBe(true);

        const registeredIds = new Set(
          (response.body.triggers as Array<{ id: string }>).map((t) => t.id)
        );

        for (const expectedId of EXPECTED_SECURITY_TRIGGER_IDS) {
          expect(registeredIds.has(expectedId), {
            message: `Security trigger "${expectedId}" is missing from the registered list`,
          }).toBe(true);
        }
      }
    );
  }
);
