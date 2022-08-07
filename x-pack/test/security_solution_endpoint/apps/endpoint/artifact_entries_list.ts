/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unzip } from 'zlib';
import { promisify } from 'util';
import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ArtifactBodyType, ArtifactResponseType, getArtifactsListTestsData } from './mocks';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'artifactEntriesList']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const endpointTestResources = getService('endpointTestResources');
  const policyTestResources = getService('policyTestResources');
  const retry = getService('retry');
  const esClient = getService('es');
  const unzipPromisify = promisify(unzip);

  describe('For each artifact list under management', function () {
    let indexedData: IndexedHostsAndAlertsResponse;

    const checkFleetArtifacts = async (
      type: string,
      identifier: string,
      expectedArtifact: ArtifactResponseType,
      expectedDecodedBodyArtifact: ArtifactBodyType
    ) => {
      // Check edited artifact is in the list with new values (wait for list to be updated)
      let updatedArtifact: ArtifactResponseType | undefined;
      await retry.waitForWithTimeout('fleet artifact is updated', 120_000, async () => {
        const {
          hits: { hits: windowsArtifactResults },
        } = await esClient.search({
          index: '.fleet-artifacts',
          size: 1,
          query: {
            bool: {
              filter: [
                {
                  match: {
                    type,
                  },
                },
                {
                  match: {
                    identifier,
                  },
                },
              ],
            },
          },
        });
        const windowsArtifact = windowsArtifactResults[0] as ArtifactResponseType;
        const isUpdated = windowsArtifact._source.body === expectedArtifact._source.body;
        if (isUpdated) updatedArtifact = windowsArtifact;
        return isUpdated;
      });

      updatedArtifact!._source.created = expectedArtifact._source.created;
      const bodyFormBuffer = Buffer.from(updatedArtifact!._source.body, 'base64');
      const unzippedBody = await unzipPromisify(bodyFormBuffer);

      // Check decoded body first to detect possible body changes
      expect(JSON.parse(unzippedBody.toString())).eql(expectedDecodedBodyArtifact);
      expect(updatedArtifact).eql(expectedArtifact);
    };

    for (const testData of getArtifactsListTestsData()) {
      describe(`When on the ${testData.title} entries list`, function () {
        before(async () => {
          const endpointPackage = await policyTestResources.getEndpointPackage();
          await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
          indexedData = await endpointTestResources.loadEndpointData();
          await browser.refresh();
          await pageObjects.artifactEntriesList.navigateToList(testData.urlPath);
        });
        after(async () => {
          await endpointTestResources.unloadEndpointData(indexedData);
        });

        it(`should not show page title if there is no ${testData.title} entry`, async () => {
          await testSubjects.missingOrFail('header-page-title');
        });

        it(`should be able to add a new ${testData.title} entry`, async () => {
          this.timeout(150_000);

          // Opens add flyout
          await testSubjects.click(`${testData.pagePrefix}-emptyState-addButton`);

          for (const formAction of testData.create.formFields) {
            if (formAction.type === 'click') {
              await testSubjects.click(formAction.selector);
            } else if (formAction.type === 'input') {
              await testSubjects.setValue(formAction.selector, formAction.value || '');
            }
          }

          // Submit create artifact form
          await testSubjects.click(`${testData.pagePrefix}-flyout-submitButton`);
          // Check new artifact is in the list
          for (const checkResult of testData.create.checkResults) {
            expect(await testSubjects.getVisibleText(checkResult.selector)).to.equal(
              checkResult.value
            );
          }
          await pageObjects.common.closeToast();

          // Title is shown after adding an item
          expect(await testSubjects.getVisibleText('header-page-title')).to.equal(testData.title);

          // Checks if fleet artifact has been updated correctly
          await checkFleetArtifacts(
            testData.fleetArtifact.type,
            testData.fleetArtifact.identifier,
            testData.fleetArtifact.getExpectedUpdatedtArtifactWhenCreate(),
            testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenCreate()
          );
        });

        it(`should be able to update an existing ${testData.title} entry`, async () => {
          this.timeout(150_000);

          // Opens edit flyout
          await pageObjects.artifactEntriesList.clickCardActionMenu(testData.pagePrefix);
          await testSubjects.click(`${testData.pagePrefix}-card-cardEditAction`);

          for (const formAction of testData.update.formFields) {
            if (formAction.type === 'click') {
              await testSubjects.click(formAction.selector);
            } else if (formAction.type === 'input') {
              await testSubjects.setValue(formAction.selector, formAction.value || '');
            } else if (formAction.type === 'clear') {
              await (
                await (await testSubjects.find(formAction.selector)).findByCssSelector('button')
              ).click();
            }
          }

          // Submit edit artifact form
          await testSubjects.click(`${testData.pagePrefix}-flyout-submitButton`);

          // Check edited artifact is in the list with new values (wait for list to be updated)
          await retry.waitForWithTimeout('entry is updated in list', 10000, async () => {
            const currentValue = await testSubjects.getVisibleText(
              `${testData.pagePrefix}-card-criteriaConditions`
            );
            return currentValue === testData.update.waitForValue;
          });

          for (const checkResult of testData.update.checkResults) {
            expect(await testSubjects.getVisibleText(checkResult.selector)).to.equal(
              checkResult.value
            );
          }

          await pageObjects.common.closeToast();

          // Title still shown after editing an item
          expect(await testSubjects.getVisibleText('header-page-title')).to.equal(testData.title);

          // Checks if fleet artifact has been updated correctly
          await checkFleetArtifacts(
            testData.fleetArtifact.type,
            testData.fleetArtifact.identifier,
            testData.fleetArtifact.getExpectedUpdatedArtifactWhenUpdate(),
            testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenUpdate()
          );
        });

        it(`should be able to delete the existing ${testData.title} entry`, async () => {
          // Remove it
          await pageObjects.artifactEntriesList.clickCardActionMenu(testData.pagePrefix);
          await testSubjects.click(`${testData.pagePrefix}-card-cardDeleteAction`);
          await testSubjects.click(`${testData.pagePrefix}-deleteModal-submitButton`);
          await testSubjects.waitForDeleted(testData.delete.confirmSelector);
          // We only expect one artifact to have been visible
          await testSubjects.missingOrFail(testData.delete.card);
          // Header has gone because there is no artifact
          await testSubjects.missingOrFail('header-page-title');
        });
      });
    }
  });
};
