/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, ENDPOINT_MANAGEMENT_LINK_IDS } from '../fixtures';

/**
 * The matrix synthesises roles from privilege combinations. These two are shipped role definitions,
 * so they prove something it cannot: that the roles we hand users grant what we believe they grant.
 *
 * `loginAsSecurityRole` rather than `loginWithBuiltInRole`, which throws on serverless.
 *
 * Serverless only, as in the original. `loginAsSecurityRole` recreates the serverless descriptor as
 * a custom role on stateful, but `detections_admin` holds `endpoint_exceptions_all`, and
 * `getCanReadAnyArtifact` in `management/links.ts` counts that privilege towards the Artifacts
 * link. Whether the serverless expectation below still holds for the same descriptor on stateful is
 * unverified, so this is not extended there; the privilege itself is covered per deployment by the
 * matrix spec.
 */
spaceTest.describe(
  'Endpoint management navigation for prebuilt roles',
  { tag: [...tags.serverless.security.complete] },
  () => {
    spaceTest(
      'detections_admin reaches no Endpoint management area',
      async ({ browserAuth, pageObjects }) => {
        const nav = pageObjects.endpointManagementNav;

        await browserAuth.loginAsSecurityRole('detections_admin');
        await nav.gotoSecurityRoot();

        await expect(nav.managementGroupToggle).toBeHidden();
        await nav.openManagementGroup();

        for (const linkId of ENDPOINT_MANAGEMENT_LINK_IDS) {
          await expect(nav.navItem(linkId)).toBeHidden();
        }
      }
    );

    spaceTest(
      'soc_manager reaches every Endpoint management area',
      async ({ browserAuth, pageObjects }) => {
        const nav = pageObjects.endpointManagementNav;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await nav.gotoSecurityRoot();

        await expect(nav.managementGroupToggle).toBeVisible();
        await nav.openManagementGroup();

        for (const linkId of ENDPOINT_MANAGEMENT_LINK_IDS) {
          await expect(nav.navItem(linkId)).toBeVisible();
        }
      }
    );
  }
);
