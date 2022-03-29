/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/dev-utils';

const INTEGRATION_TEST_ROOT = process.env.WORKSPACE || resolve(REPO_ROOT, '../integration-test');
const ARCHIVE = resolve(
  INTEGRATION_TEST_ROOT,
  'test/es_archives/email_connectors_with_encryption_rotation'
);

export default ({ getPageObjects, getService }) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI']);
  const find = getService('find');
  const retry = getService('retry');

  const address = (name) => (emails) => emails.split(',').find((x) => x.includes(name));
  const toWayne = address('wayne');

  describe('encryption key rotation with', function () {
    before(async () => {
      esArchiver.load(ARCHIVE);
    });
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersConnectors');
    });
    after(async () => {
      esArchiver.unload(ARCHIVE);
    });

    describe(`email connectors`, () => {
      describe(`without the key used to create it`, () => {
        it('should show a failure callout', async () => {
          const connectorName = 'should_fail';
          await testConnector(connectorName);
          await retry.try(async () => {
            const executionFailureResultCallout = await testSubjects.find('executionFailureResult');
            expect(await executionFailureResultCallout.getVisibleText()).to.be(
              "Test·failed·to·run\nThe·following·error·was·found:\nerror·sending·email\nDetails:\nCan't·send·mail·-·all·recipients·were·rejected:·550·5.7.1·Relaying·denied"
            );
          });
          expect(true).to.be(true);
        });
      });
      describe(`with a decryption only key`, () => {
        it('should show a success callout', async () => {
          const connectorName = 'decrypt_only';
          await testConnector(connectorName);
          await retry.try(async () => {
            await testSubjects.find('executionSuccessfulResult');
          });
        });
      });
      describe(`with the current key`, () => {
        it('should show a success callout', async () => {
          const connectorName = 'current_key';
          await testConnector(connectorName);
          await retry.try(async () => {
            await testSubjects.find('executionSuccessfulResult');
          });
        });
      });
    });
  });

  async function testConnector(name) {
    await pageObjects.triggersActionsUI.searchConnectors(name);
    await testSubjects.click('runConnector');
    await testSubjects.setValue('comboBoxInput', toWayne(process.env.REPORTING_TEST_EMAILS));
    await testSubjects.setValue('subjectInput', name);
    await testSubjects.setValue('messageTextArea', name);
    await find.clickByCssSelector('[data-test-subj="executeActionButton"]:not(disabled)');
  }
};
