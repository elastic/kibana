/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';

import { FtrProviderContext } from '../ftr_provider_context';

const TIMEOUT_CHECK = 3000;

export function SearchClassicNavigationProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

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
  const sideNavTestSubj = (id: string) => `searchSideNav-${id}`;

  return {
    async expectAllNavItems(items: Array<{ id: string; label: string }>) {
      for (const navItem of items) {
        await testSubjects.existOrFail(sideNavTestSubj(navItem.id));
        const itemElement = await testSubjects.find(sideNavTestSubj(navItem.id));
        const itemLabel = await itemElement.getVisibleText();
        expect(itemLabel).to.equal(navItem.label);
      }
      const allSideNavItems = await testSubjects.findAll('*searchSideNav-');
      expect(allSideNavItems.length).to.equal(items.length);
    },

    async expectNavItemExists(id: string) {
      await testSubjects.existOrFail(sideNavTestSubj(id));
    },

    async expectNavItemMissing(id: string) {
      await testSubjects.missingOrFail(sideNavTestSubj(id));
    },

    async clickNavItem(id: string) {
      await testSubjects.existOrFail(sideNavTestSubj(id));
      await testSubjects.click(sideNavTestSubj(id));
    },

    async expectNavItemActive(id: string) {
      await testSubjects.existOrFail(sideNavTestSubj(id));
      const item = await testSubjects.find(sideNavTestSubj(id));
      expect(await item.elementHasClass('euiSideNavItemButton-isSelected')).to.be(true);
    },

    breadcrumbs: {
      async expectExists() {
        await testSubjects.existOrFail('breadcrumbs', { timeout: TIMEOUT_CHECK });
      },
      async clickBreadcrumb(text: string) {
        await (await getByVisibleText('~breadcrumb', text))?.click();
      },
      async getBreadcrumb(text: string) {
        return getByVisibleText('~breadcrumb', text);
      },
      async expectBreadcrumbExists(text: string) {
        await retry.try(async () => {
          expect(await getByVisibleText('~breadcrumb', text)).not.be(null);
        });
      },
      async expectBreadcrumbMissing(text: string) {
        await retry.try(async () => {
          expect(await getByVisibleText('~breadcrumb', text)).be(null);
        });
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
