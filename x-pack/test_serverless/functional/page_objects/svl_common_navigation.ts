/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

import type { NavigationID as MlNavId } from '@kbn/default-nav-ml';
import type { NavigationID as AlNavId } from '@kbn/default-nav-analytics';
import type { NavigationID as MgmtNavId } from '@kbn/default-nav-management';
import type { NavigationID as DevNavId } from '@kbn/default-nav-devtools';

// use this for nicer type suggestions, but allow any string anyway
type NavigationId = MlNavId | AlNavId | MgmtNavId | DevNavId | string;

import type { FtrProviderContext } from '../ftr_provider_context';
import type { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function SvlCommonNavigationProvider(ctx: FtrProviderContext) {
  const testSubjects = ctx.getService('testSubjects');
  const browser = ctx.getService('browser');
  const retry = ctx.getService('retry');
  const config = ctx.getService('config');
  const defaultFindTimeout = config.get('timeouts.find');

  async function getByVisibleText(
    selector: string | (() => Promise<WebElementWrapper[]>),
    text: string
  ) {
    const subjects =
      typeof selector === 'string' ? await testSubjects.findAll(selector) : await selector();
    let found: WebElementWrapper | null = null;
    for (const subject of subjects) {
      const visibleText = await subject.getVisibleText();
      if (visibleText === text) {
        found = subject;
        break;
      }
    }
    return found;
  }

  return {
    // check that chrome ui is in the serverless (project) mode
    async expectExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },
    async clickLogo() {
      await testSubjects.click('nav-header-logo');
    },
    async waitUntilLoadingHasFinished() {
      try {
        await this.isGlobalLoadingIndicatorVisible();
      } catch (exception) {
        if (exception.name === 'ElementNotVisible') {
          // selenium might just have been too slow to catch it
        } else {
          throw exception;
        }
      }
      await this.awaitGlobalLoadingIndicatorHidden();
    },
    async isGlobalLoadingIndicatorVisible() {
      return await testSubjects.exists('nav-header-loading-spinner', {
        timeout: 1500,
      });
    },
    async awaitGlobalLoadingIndicatorHidden() {
      await testSubjects.existOrFail('nav-header-logo', {
        allowHidden: true,
        timeout: defaultFindTimeout * 10,
      });
    },
    // side nav related actions
    sidenav: {
      async expectLinkExists(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId}`);
        } else {
          expect(await getByVisibleText('~nav-item', by.text)).not.be(null);
        }
      },
      async expectLinkActive(
        by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }
      ) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(
            `~nav-item-deepLinkId-${by.deepLinkId} & ~nav-item-isActive`
          );
        } else if ('navId' in by) {
          await testSubjects.existOrFail(`~nav-item-id-${by.navId} & ~nav-item-isActive`);
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            expect(await link!.elementHasClass(`nav-item-isActive`)).to.be(true);
          });
        }
      },
      async clickLink(by: { deepLinkId: AppDeepLinkId } | { navId: string } | { text: string }) {
        await this.expectLinkExists(by);
        if ('deepLinkId' in by) {
          await testSubjects.click(`~nav-item-deepLinkId-${by.deepLinkId}`);
        } else if ('navId' in by) {
          await testSubjects.click(`~nav-item-id-${by.navId}`);
        } else {
          await retry.try(async () => {
            const link = await getByVisibleText('~nav-item', by.text);
            await link!.click();
          });
        }
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
        await retry.waitFor(`section ${sectionId} to be open`, async () => {
          const isOpen = await this.isSectionOpen(sectionId);
          return isOpen;
        });
      },
      async expectSectionClosed(sectionId: NavigationId) {
        await this.expectSectionExists(sectionId);
        await retry.waitFor(`section ${sectionId} to be closed`, async () => {
          const isOpen = await this.isSectionOpen(sectionId);
          return !isOpen;
        });
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
      async expectBreadcrumbExists(by: { deepLinkId: AppDeepLinkId } | { text: string }) {
        if ('deepLinkId' in by) {
          await testSubjects.existOrFail(`~breadcrumb-deepLinkId-${by.deepLinkId}`);
        } else {
          await retry.try(async () => {
            expect(await getByVisibleText('~breadcrumb', by.text)).not.be(null);
          });
        }
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
        let foundLink: WebElementWrapper | null = null;
        await retry.try(async () => {
          foundLink = await getByVisibleText(
            async () =>
              (await testSubjects.find('nav-bucket-recentlyAccessed')).findAllByTagName('a'),
            text
          );
          expect(!!foundLink).to.be(true);
        });

        return foundLink!;
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
