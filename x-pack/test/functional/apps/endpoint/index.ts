/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('Endpoint icon exists', function() {
    this.tags('ciGroup7');

    it('shows endpoint navlink', async () => {
      await pageObjects.common.navigateToApp('home');
      const navLinks = (await appsMenu.readLinks()).map(
        (link: Record<string, string>) => link.text
      );
      expect(navLinks).to.contain('EEndpoint');
    });

    describe('Endpoint app', function() {
      beforeEach(async function() {
        await pageObjects.common.navigateToApp('endpoint');
      });

      it("displays the text 'Hello World'", async function() {
        await testSubjects.existOrFail('welcomeTitle');
      });
    });
  });
}
