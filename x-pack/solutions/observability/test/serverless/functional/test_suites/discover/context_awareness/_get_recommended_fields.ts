/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'svlCommonPage', 'header']);
  const dataViews = getService('dataViews');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('extension getRecommendedFields', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('ES|QL mode', () => {
      it('should show recommended fields section for matching profile', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-logs' },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.existOrFail('fieldListGroupedRecommendedFields');
      });

      it('should not show recommended fields for non-matching profile', async () => {
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: 'from my-example-*' },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await testSubjects.missingOrFail('fieldListGroupedRecommendedFields');
      });
    });

    describe('data view mode', () => {
      it('should show recommended fields section for matching profile', async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataViews.switchToAndValidate('my-example-logs');

        await testSubjects.existOrFail('fieldListGroupedRecommendedFields');
      });

      it('should not show recommended fields for non-matching profile', async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await dataViews.switchToAndValidate('my-example-*');

        await testSubjects.missingOrFail('fieldListGroupedRecommendedFields');
      });
    });
  });
}
