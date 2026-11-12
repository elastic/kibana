/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
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
 * a custom role on stateful, so extending these would assert the same descriptor twice rather than
 * cover a second deployment; the privileges themselves are covered per deployment by the matrix.
 */
spaceTest.describe(
  'Endpoint management navigation for prebuilt roles',
  { tag: [...tags.serverless.security.complete] },
  () => {
    /**
     * The Cypress original expected no area at all here. That expectation never ran: it looked for
     * the assets group without opening the "More" overflow it sits in, so it passed whether or not
     * the group was there. `detections_admin` holds `endpoint_exceptions_all`, and
     * `getCanReadAnyArtifact` in `management/links.ts` counts endpoint exceptions towards the
     * Artifacts link, so Artifacts is reachable and the three other areas are not. Stateful grants
     * the same privilege the same way.
     */
    spaceTest(
      'detections_admin reaches only Artifacts, through endpoint exceptions',
      async ({ browserAuth, pageObjects }) => {
        const nav = pageObjects.endpointManagementNav;

        await browserAuth.loginAsSecurityRole('detections_admin');
        await nav.gotoSecurityRoot();

        await expect(nav.managementGroupToggle).toBeVisible();
        await nav.openManagementGroup();

        await expect(nav.navItem(SecurityPageName.artifacts)).toBeVisible();

        const unreachable = ENDPOINT_MANAGEMENT_LINK_IDS.filter(
          (linkId) => linkId !== SecurityPageName.artifacts
        );

        for (const linkId of unreachable) {
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
