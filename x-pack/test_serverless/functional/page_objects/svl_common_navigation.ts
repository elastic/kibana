/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

import type { NavigationID as MLNavID } from '@kbn/default-nav-ml';
import type { NavigationID as AlNavId } from '@kbn/default-nav-analytics';
import type { NavigationID as MgmtNavId } from '@kbn/default-nav-management';
import type { NavigationID as DevNavId } from '@kbn/default-nav-devtools';

// use this for nicer type suggestions, but allow any string anyway
type NavigationId = MLNavID | AlNavId | MgmtNavId | DevNavId | string;

import type { FtrProviderContext } from '../ftr_provider_context';
import type { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function SvlCommonNavigationProvider(ctx: FtrProviderContext) {
  const testSubjects = ctx.getService('testSubjects');
  const browser = ctx.getService('browser');

  return {
    // check that chrome ui is in the serverless (project) mode
    async expectExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },
    async clickLogo() {
      await testSubjects.click('nav-header-logo');
    },
    // side nav related actions
    sidenav: {
      async expectDeepLinkExists(appDeepLinkId: AppDeepLinkId) {
        await testSubjects.existOrFail(`~nav-item-deepLinkId-${appDeepLinkId}`);
      },
      async expectDeepLinkActive(appDeepLinkId: AppDeepLinkId) {
        await this.expectDeepLinkExists(appDeepLinkId);
        await testSubjects.existOrFail(
          `~nav-item-deepLinkId-${appDeepLinkId} & ~nav-item-isActive`
        );
      },
      async clickDeepLink(appDeepLinkId: AppDeepLinkId) {
        await this.expectDeepLinkExists(appDeepLinkId);
        await testSubjects.click(`~nav-item-deepLinkId-${appDeepLinkId}`);
      },
      async expectSectionExists(sectionId: NavigationId) {
        await testSubjects.existOrFail(`~nav-bucket-${sectionId}`);
      },
      async isSectionOpen(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const section = await testSubjects.find(`~nav-bucket-${sectionId}`);
        const collapseBtn = await section.findByCssSelector(`[aria-controls="${sectionId}"]`);
        const isExpanded = await collapseBtn.getAttribute('aria-expanded');
        return isExpanded === 'true';
      },
      async expectSectionOpen(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        expect(isOpen).to.be(true);
      },
      async expectSectionClosed(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        expect(isOpen).to.be(false);
      },
      async openSection(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        if (isOpen) return;
        const section = await testSubjects.find(`~nav-bucket-${sectionId}`);
        const collapseBtn = await section.findByCssSelector(`[aria-controls="${sectionId}"]`);
        await collapseBtn.click();
        await this.expectSectionOpen(sectionId);
      },
      async closeSection(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        const isOpen = await this.isSectionOpen(sectionId);
        if (!isOpen) return;
        const section = await testSubjects.find(`~nav-bucket-${sectionId}`);
        const collapseBtn = await section.findByCssSelector(`[aria-controls="${sectionId}"]`);
        await collapseBtn.click();
        await this.expectSectionClosed(sectionId);
      },
    },
    breadcrumbs: {
      async expectExists() {
        await testSubjects.existOrFail('breadcrumbs');
      },
      async clickHome() {
        await testSubjects.click('~breadcrumb-home');
      },
      async expectExistsByDeepLink(appDeepLinkId: AppDeepLinkId) {
        await testSubjects.existOrFail(`~breadcrumb-deepLinkId-${appDeepLinkId}`);
      },
      async expectExistsByText(text: string) {
        const breadcrumbs = await testSubjects.findAll(`~breadcrumb`);
        let exists = false;
        for (const breadcrumb of breadcrumbs) {
          const breadcrumbText = await breadcrumb.getVisibleText();
          if (breadcrumbText === text) {
            exists = true;
            break;
          }
        }
        expect(exists).to.be(true);
      },
    },
    search: new SvlNavigationSearchPageObject(ctx),
    recent: {
      async expectExists() {
        await testSubjects.existOrFail('nav-bucket-recentlyAccessed');
      },
      async expectHidden() {
        await testSubjects.missingOrFail('nav-bucket-recentlyAccessed', { timeout: 1000 });
      },
      async expectLinkExists(text: string) {
        await this.expectExists();
        const links = await (
          await testSubjects.find('nav-bucket-recentlyAccessed')
        ).findAllByTagName('a');
        let foundLink: WebElementWrapper | null = null;
        for (const link of links) {
          const linkText = await link.getVisibleText();
          if (linkText === text) {
            foundLink = link;
            break;
          }
        }
        expect(!!foundLink).to.be(true);
        return foundLink;
      },
      async clickLink(text: string) {
        const link = await this.expectLinkExists(text);
        await link!.click();
      },
    },

    // helper to assert that the page did not reload
    async createNoPageReloadCheck() {
      const trackReloadTs = Date.now();
      await browser.execute(
        ({ ts }) => {
          // @ts-ignore
          window.__testTrackReload__ = ts;
        },
        {
          ts: trackReloadTs,
        }
      );

      return async () => {
        const noReload = await browser.execute(
          ({ ts }) => {
            // @ts-ignore
            return window.__testTrackReload__ && window.__testTrackReload__ === ts;
          },
          {
            ts: trackReloadTs,
          }
        );
        expect(noReload).to.be(true);
      };
    },
  };
}

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { NavigationalSearchPageObject } from '../../../test/functional/page_objects/navigational_search';
class SvlNavigationSearchPageObject extends NavigationalSearchPageObject {
  constructor(ctx: FtrProviderContext) {
    // @ts-expect-error -- this expects FtrProviderContext from x-pack/test/functional/ftr_provider_context.ts
    super(ctx);
  }

  async showSearch() {
    await this.ctx.getService('testSubjects').click('nav-search-reveal');
  }
  async hideSearch() {
    await this.ctx.getService('testSubjects').click('nav-search-conceal');
  }
}
