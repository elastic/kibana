/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SolutionView, Space } from '@kbn/spaces-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spacesService = getService('spaces');
  const browser = getService('browser');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');

  describe('space solution tour', () => {
    let version: string | undefined;

    const getGlobalSettings = async () => {
      const doc = await es.get(
        { id: `config-global:${version}`, index: '.kibana' },
        { headers: { 'kbn-xsrf': 'spaces' }, ignore: [404] }
      );
      const value = (doc?._source as any)?.['config-global'] || null;
      return value;
    };

    const removeGlobalSettings = async () => {
      version = version ?? (await kibanaServer.version.get());
      version = version.replace(/-SNAPSHOT$/, '');

      log.debug(`Deleting [config-global:${version}] doc from the .kibana index`);

      await es
        .delete(
          { id: `config-global:${version}`, index: '.kibana', refresh: 'wait_for' },
          { headers: { 'kbn-xsrf': 'spaces' } }
        )
        .catch((error) => {
          if (error.statusCode === 404) return; // ignore 404 errors
          throw error;
        });

      await retry.tryForTime(3000, async () => {
        const value = await getGlobalSettings();
        return value === null;
      });
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('solution tour', () => {
      let _defaultSpace: Space | undefined = {
        id: 'default',
        name: 'Default',
        disabledFeatures: [],
      };

      const updateSolutionDefaultSpace = async (solution: SolutionView) => {
        log.debug(`Updating default space solution: [${solution}].`);

        await spacesService.update('default', {
          ..._defaultSpace,
          solution,
        });
      };

      before(async () => {
        _defaultSpace = await spacesService.get('default');
        await removeGlobalSettings(); // Make sure we start from a clean state

        await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          shouldUseHashForSubUrl: false,
        });

        await PageObjects.common.sleep(1000); // wait to save the setting
      });

      afterEach(async () => {
        await updateSolutionDefaultSpace('classic'); // revert to not impact future tests
      });

      it('does not show the solution tour for the classic space', async () => {
        await testSubjects.missingOrFail('spaceSolutionTour', { timeout: 3000 });
      });

      it('does show the solution tour if the default space has a solution set', async () => {
        await updateSolutionDefaultSpace('es'); // set a solution
        await PageObjects.common.sleep(500);
        await removeGlobalSettings(); // Make sure we start from a clean state
        await browser.refresh();

        await testSubjects.existOrFail('spaceSolutionTour', { timeout: 3000 });

        await testSubjects.click('closeTourBtn'); // close the tour
        await PageObjects.common.sleep(1000); // wait to save the setting

        await browser.refresh();
        await testSubjects.missingOrFail('spaceSolutionTour', { timeout: 3000 }); // The tour does not appear after refresh
      });

      it('does not show the solution tour after updating the default space from classic to solution', async () => {
        await updateSolutionDefaultSpace('es'); // set a solution
        await PageObjects.common.sleep(500);
        await browser.refresh();

        // The tour does not appear after refresh, even with the default space with a solution set
        await testSubjects.missingOrFail('spaceSolutionTour', { timeout: 3000 });
      });

      it('does not show the solution tour after deleting spaces and leave only the default', async () => {
        await updateSolutionDefaultSpace('es'); // set a solution

        await spacesService.create({
          id: 'foo-space',
          name: 'Foo Space',
          disabledFeatures: [],
          color: '#AABBCC',
        });

        const allSpaces = await spacesService.getAll();
        expect(allSpaces).to.have.length(2); // Make sure we have 2 spaces

        await removeGlobalSettings(); // Make sure we start from a clean state
        await browser.refresh();

        await testSubjects.missingOrFail('spaceSolutionTour', { timeout: 3000 });

        await spacesService.delete('foo-space');
        await browser.refresh();

        // The tour still does not appear after refresh, even with 1 space with a solution set
        await testSubjects.missingOrFail('spaceSolutionTour', { timeout: 3000 });
      });
    });
  });
}
