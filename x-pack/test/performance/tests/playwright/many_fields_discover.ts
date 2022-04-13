/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { StepCtx } from '../../services/performance';

export default function manyFieldsDiscover({ getService }: FtrProviderContext) {
  describe('many_fields_discover', () => {
    const performance = getService('performance');
    const esArchiver = getService('esArchiver');
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/many_fields_data_view'
      );
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/many_fields');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/many_fields_data_view'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/many_fields');
    });

    it('many_fields_discover', async () => {
      await performance.runUserJourney(
        'many_fields_discover',
        [
          {
            name: 'Go to Discover Page',
            handler: async ({ page, kibanaUrl }: StepCtx) => {
              await page.goto(`${kibanaUrl}/app/discover`);
              await page.waitForSelector('[data-test-subj="discoverDocTable"]');
            },
          },
          {
            name: 'Expand the first document',
            handler: async ({ page }) => {
              const expandButtons = page.locator(
                '[data-test-subj="docTableExpandToggleColumn"]'
              );
              await expandButtons.first().click();
              await page.locator('text="Expanded document"');
            }
          }
        ],
        {
          requireAuth: false,
        }
      );
    });
  });
}
