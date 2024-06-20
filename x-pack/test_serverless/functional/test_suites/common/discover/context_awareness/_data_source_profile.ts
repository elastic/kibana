/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'unifiedFieldList']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');

  describe('data source profile', () => {
    describe('ES|QL mode', () => {
      describe('cell renderers', () => {
        it('should not render custom @timestamp or log.level', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-* | sort @timestamp desc' },
          });
          await PageObjects.common.navigateToApp('discover', {
            hash: `/?_a=${state}`,
          });
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp', 2500);
          expect(timestamps).to.have.length(0);
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel', 2500);
          expect(logLevels).to.have.length(0);
        });

        it('should not render custom @timestamp but should render custom log.level', async () => {
          const state = kbnRison.encode({
            dataSource: { type: 'esql' },
            query: { esql: 'from my-example-logs | sort @timestamp desc' },
          });
          await PageObjects.common.navigateToApp('discover', {
            hash: `/?_a=${state}`,
          });
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp', 2500);
          expect(timestamps).to.have.length(0);
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel');
          expect(logLevels).to.have.length(3);
          expect(await logLevels[0].getVisibleText()).to.be('Debug');
          expect(await logLevels[2].getVisibleText()).to.be('Info');
        });
      });
    });

    describe('data view mode', () => {
      describe('cell renderers', () => {
        it('should not render custom @timestamp or log.level', async () => {
          await PageObjects.common.navigateToApp('discover');
          await dataViews.switchTo('my-example-*');
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp', 2500);
          expect(timestamps).to.have.length(0);
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel', 2500);
          expect(logLevels).to.have.length(0);
        });

        it('should not render custom @timestamp but should render custom log.level', async () => {
          await PageObjects.common.navigateToApp('discover');
          await dataViews.switchTo('my-example-logs');
          await PageObjects.discover.waitUntilSearchingHasFinished();
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('@timestamp');
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('log.level');
          const timestamps = await testSubjects.findAll('exampleRootProfileTimestamp', 2500);
          expect(timestamps).to.have.length(0);
          const logLevels = await testSubjects.findAll('exampleDataSourceProfileLogLevel');
          expect(logLevels).to.have.length(3);
          expect(await logLevels[0].getVisibleText()).to.be('Debug');
          expect(await logLevels[2].getVisibleText()).to.be('Info');
        });
      });
    });
  });
}
