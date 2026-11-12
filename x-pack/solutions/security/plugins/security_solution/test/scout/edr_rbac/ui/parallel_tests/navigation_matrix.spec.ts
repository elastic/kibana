/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  spaceTest,
  ENDPOINT_MANAGEMENT_AREAS,
  ENDPOINT_MANAGEMENT_LINK_IDS,
  getSingleAreaRole,
  getBasePrivilegeOnlyRole,
} from '../fixtures';

/**
 * A management area outside the Endpoint sub-features, so it stays reachable on the base privilege
 * alone. Used only to confirm the link surface has rendered before asserting absence.
 */
const ALWAYS_GRANTED_LANDING_LINK_ID = SecurityPageName.entityAnalyticsManagement;

/**
 * Current feature version only. A deprecated version's privileges are mapped onto the current
 * version's `ui:` actions before anything renders, and Fleet reads only the current version's
 * capabilities, so the rendering step cannot vary by version. The mapping itself is asserted in
 * `siem_deprecated_ui_actions.ts`.
 */
spaceTest.describe(
  'Endpoint management navigation RBAC',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest(
      'grants no management area to a role holding only the base privilege',
      async ({ browserAuth, pageObjects }) => {
        const nav = pageObjects.endpointManagementNav;

        await browserAuth.loginWithCustomRole(getBasePrivilegeOnlyRole());
        // `gotoSecurityRoot` settles on the navigation having rendered, so the expectations below
        // cannot pass against a nav that has yet to populate.
        await nav.gotoSecurityRoot();
        await nav.openManagementGroup();

        for (const linkId of ENDPOINT_MANAGEMENT_LINK_IDS) {
          await expect(nav.navItem(linkId)).toBeHidden();
        }

        await nav.gotoManageLanding();

        // Same reasoning on the second surface: `gotoManageLanding` only waits for `load`, and
        // Security resolves its links afterwards.
        await expect(nav.landingCard(ALWAYS_GRANTED_LANDING_LINK_ID)).toBeVisible();

        for (const linkId of ENDPOINT_MANAGEMENT_LINK_IDS) {
          await expect(nav.landingCard(linkId)).toBeHidden();
        }
      }
    );

    for (const access of ['read', 'all'] as const) {
      for (const { linkId, privilegePrefix } of ENDPOINT_MANAGEMENT_AREAS) {
        const otherLinkIds = ENDPOINT_MANAGEMENT_LINK_IDS.filter((id) => id !== linkId);

        spaceTest(
          `grants only ${linkId} to ${privilegePrefix}${access}`,
          async ({ browserAuth, pageObjects }) => {
            const nav = pageObjects.endpointManagementNav;

            await browserAuth.loginWithCustomRole(getSingleAreaRole(privilegePrefix, access));
            await nav.gotoSecurityRoot();

            await expect(nav.managementGroupToggle).toBeVisible();
            await nav.openManagementGroup();
            await expect(nav.navItem(linkId)).toBeVisible();

            for (const otherLinkId of otherLinkIds) {
              await expect(nav.navItem(otherLinkId)).toBeHidden();
            }

            // Same link array, second surface.
            await nav.gotoManageLanding();
            await expect(nav.landingCard(linkId)).toBeVisible();

            for (const otherLinkId of otherLinkIds) {
              await expect(nav.landingCard(otherLinkId)).toBeHidden();
            }
          }
        );
      }
    }
  }
);
