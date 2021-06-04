/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('canvas smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const canvasTests = [
      {
        name: 'flights',
        id: 'workpad-a474e74b-aedc-47c3-894a-db77e62c41e0/page/1',
        altId: '',
        numElements: 35,
      },
      {
        name: 'logs',
        id: 'workpad-5563cc40-5760-4afe-bf33-9da72fac53b7/page/1',
        altId: 'workpad-ad72a4e9-b422-480c-be6d-a64a0b79541d',
        numElements: 57,
      },
      {
        name: 'ecommerce',
        id: 'workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1',
        altId: '',
        numElements: 16,
      },
      {
        name: 'ecommerce',
        id: 'workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/2',
        altId: '',
        numElements: 9,
      },
    ];

    spaces.forEach(({ space, basePath }) => {
      canvasTests.forEach(({ name, id, altId, numElements }) => {
        describe('space ' + space + ' name ' + name, () => {
          beforeEach(async () => {
            await PageObjects.common.navigateToActualUrl('canvas', 'workpad/' + id, {
              basePath,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            const url = await browser.getCurrentUrl();
            if (!url.includes(id) && altId.length > 0) {
              await PageObjects.common.navigateToActualUrl('canvas', 'workpad/' + altId, {
                basePath,
              });
            }
            await PageObjects.header.waitUntilLoadingHasFinished();
          });
          it('renders elements on workpad', async () => {
            await retry.try(async () => {
              const elements = await testSubjects.findAll(
                'canvasWorkpadPage > canvasWorkpadPageElementContent'
              );
              expect(elements).to.have.length(numElements);
            });
          });
        });
      });
    });
  });
}
