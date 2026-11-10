/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { spaceTest, getSpaceScopedEndpointRole } from '../fixtures';

/**
 * The Cypress original drove the whole thing through the role editor — seven sequential clicks to
 * build the privileges before asserting. Every recorded CI failure in that folder happened in that
 * setup rather than the assertion, so the role is created through the API here and the browser is
 * used only to read the privilege summary back.
 */
spaceTest.describe(
  'Endpoint sub-feature privileges configured for a single space',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // Unique per test rather than shared across the file, so a failure cannot leak into the next.
    let roleName: string;

    spaceTest.beforeEach(async ({ kbnClient, scoutSpace }) => {
      roleName = `edr_rbac_summary_${scoutSpace.id}_${Date.now()}`;

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${roleName}`,
        body: getSpaceScopedEndpointRole(scoutSpace.id),
      });
    });

    spaceTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${roleName}`,
        ignoreErrors: [404],
      });
    });

    spaceTest(
      'shows the granted sub-feature privileges against that space',
      async ({ browserAuth, pageObjects, scoutSpace }) => {
        const summary = pageObjects.rolePrivilegeSummary;

        await browserAuth.loginAsAdmin();
        await summary.gotoRole(roleName);
        await summary.openSummary();

        // Guards against the expansion silently matching nothing, which would make every
        // assertion below vacuous.
        expect(await summary.expandAllRows()).toBeGreaterThan(0);

        await expect(summary.spaceAvatar(scoutSpace.id)).toBeVisible();

        await expect(summary.subFeaturePrivilege(SECURITY_FEATURE_ID, 'Endpoint List')).toHaveText(
          'All'
        );
        await expect(summary.subFeaturePrivilege(SECURITY_FEATURE_ID, 'Host Isolation')).toHaveText(
          'All'
        );
        // One ungranted sub-feature is enough to show the summary is not reporting All everywhere;
        // the full inventory is covered by the unit test in `packages/features`.
        await expect(summary.subFeaturePrivilege(SECURITY_FEATURE_ID, 'Blocklist')).toHaveText(
          'None'
        );
      }
    );
  }
);
