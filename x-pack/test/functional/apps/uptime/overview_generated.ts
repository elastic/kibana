/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { AutoSuggestInteraction } from '../../services/uptime/types';

const makeInteraction = (
  keyPresses: string[],
  autocompleteText?: string,
  suggestionKey?: string
): AutoSuggestInteraction => ({
  keyPresses,
  autocompleteText,
  suggestionKey,
});

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage } = getPageObjects(['uptime']);
  const uptimeService = getService('uptime');
  const browser = getService('browser');
  const retry = getService('retry');

  describe('overview page generated', function() {
    beforeEach(async () => {
      await makeChecksWithStatus(
        getService('legacyEs'),
        'test-overview-id',
        10,
        2,
        10000,
        {},
        'up'
      );
      await uptimeService.navigation.goToUptime();
    });

    it('search bar auto-suggest works', async () => {
      const down = browser.keys.ARROW_DOWN;
      const enter = browser.keys.ENTER;

      uptimePage.useKueryBarAutocomplete('overviewPage', [
        makeInteraction([down, down, down, enter], 'monitor.', '1'),
        makeInteraction([down, down, enter], undefined, '0'),
        makeInteraction([down, enter, enter]),
      ]);

      retry.try(async () => {
        await uptimeService.common.urlContains('search=monitor.id%20%3A%20"test-overview-id"');
      });
    });
  });
};
