/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'timePicker',
    'discover',
    'svlCommonPage',
    'unifiedFieldList',
    'header',
  ]);
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');

  describe('row leading controls', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('DataView mode', () => {
      it('should have explore event and alert in security leading action', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await queryBar.setQuery('host.name: "siem-kibana"');
        await queryBar.clickQuerySubmitButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const exploreInSecurityAction = await testSubjects.findAll(
          'unifiedDataTable_rowControl_additionalRowControl_exploreInSecurity',
          5000
        );
        expect(exploreInSecurityAction).to.have.length(2);

        expect(await exploreInSecurityAction[0].getAttribute('aria-label')).to.eql(
          'Explore Alert in Security'
        );
        expect(await exploreInSecurityAction[1].getAttribute('aria-label')).to.eql(
          'Explore Event in Security'
        );
      });
    });

    describe('ES|QL mode', () => {
      it('should have explore event in security leading action', async () => {
        const query = `FROM ${SECURITY_SOLUTION_DATA_VIEW}`;
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: query },
        });

        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const exploreInSecurityAction = await testSubjects.findAll(
          'unifiedDataTable_rowControl_additionalRowControl_exploreInSecurity',
          5000
        );
        expect(exploreInSecurityAction).to.have.length(2);

        expect(await exploreInSecurityAction[0].getAttribute('aria-label')).to.eql(
          'Explore Alert in Security'
        );
        expect(await exploreInSecurityAction[1].getAttribute('aria-label')).to.eql(
          'Explore Event in Security'
        );
      });
    });
  });
}
