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
import {
  ENDPOINT_ARTIFACT_LIST_IDS,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import { ManifestConstants } from '@kbn/security-solution-plugin/server/endpoint/lib/artifacts';
import { ArtifactElasticsearchProperties } from '@kbn/fleet-plugin/server/services';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  ArtifactBodyType,
  getArtifactsListTestsData,
  ArtifactActionsType,
  AgentPolicyResponseType,
  InternalManifestSchemaResponseType,
  getCreateMultipleData,
  MultipleArtifactActionsType,
} from './mocks';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'artifactEntriesList']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const endpointTestResources = getService('endpointTestResources');
  const retry = getService('retry');
  const esClient = getService('es');
  const supertest = getService('supertest');
  const find = getService('find');
  const policyTestResources = getService('policyTestResources');
  const unzipPromisify = promisify(unzip);

  const removeAllArtifacts = async () => {
    for (const listId of ENDPOINT_ARTIFACT_LIST_IDS) {
      await removeExceptionsList(listId);
    }
  };

  const removeExceptionsList = async (listId: string) => {
    await supertest
      .delete(`${EXCEPTION_LIST_URL}?list_id=${listId}&namespace_type=agnostic`)
      .set('kbn-xsrf', 'true');
  };

  // FLAKY: https://github.com/elastic/kibana/issues/159695
  describe.skip('For each artifact list under management', function () {
    this.timeout(60_000 * 5);
    let indexedData: IndexedHostsAndAlertsResponse;
    let policyInfo: PolicyTestResourceInfo;

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData();
    });
    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
    });

    const checkFleetArtifacts = async (
      identifier: string,
      expectedArtifact: ArtifactElasticsearchProperties,
      expectedDecodedBodyArtifact: ArtifactBodyType,
      policy?: PolicyTestResourceInfo
    ) => {
      // Check edited artifact is in the list with new values (wait for list to be updated)
      let updatedArtifact: ArtifactElasticsearchProperties | undefined;
      await retry.waitForWithTimeout('fleet artifact is updated', 120_000, async () => {
        // Get endpoint manifest
        const {
          hits: { hits: manifestResults },
        } = await esClient.search({
          index: '.kibana*',
          query: {
            bool: {
              filter: [
                {
                  term: {
                    type: ManifestConstants.SAVED_OBJECT_TYPE,
                  },
                },
              ],
            },
          },
          size: 1,
        });

        const manifestResult = manifestResults[0] as InternalManifestSchemaResponseType;
        const manifestArtifact = manifestResult._source[
          'endpoint:user-artifact-manifest'
        ].artifacts.find((artifact) => {
          return (
            artifact.artifactId ===
              `${expectedArtifact.identifier}-${expectedArtifact.decoded_sha256}` &&
            artifact.policyId === policy?.packagePolicy.id
          );
        });

        if (!manifestArtifact) return false;

        // Get fleet artifact
        const windowsArtifactResult = await esClient.get({
          index: '.fleet-artifacts-7',
          id: `endpoint:${expectedArtifact.identifier}-${expectedArtifact.decoded_sha256}`,
        });

        const windowsArtifact = windowsArtifactResult._source as ArtifactElasticsearchProperties;

        // Get agent policy
        const {
          hits: { hits: policiesResults },
        } = await esClient.search({
          index: '.fleet-policies*',
          query: {
            bool: {
              filter: [
                {
                  match: {
                    policy_id: policy?.agentPolicy.id,
                  },
                },
              ],
            },
          },
          sort: [{ revision_idx: { order: 'desc' } }],
          size: 1,
        });

        const agentPolicyResults = policiesResults[0] as AgentPolicyResponseType;
        const policyArtifactManifest = agentPolicyResults._source.data.inputs[0]
          ? agentPolicyResults._source.data.inputs[0].artifact_manifest
          : undefined;

        let isUpdated: boolean = false;
        if (policyArtifactManifest) {
          // Compare artifacts from fleet artifacts and agent policy are the expecteds
          isUpdated =
            windowsArtifact.encoded_sha256 === expectedArtifact.encoded_sha256 &&
            policyArtifactManifest.artifacts[identifier].encoded_sha256 ===
              expectedArtifact.encoded_sha256;
        }

        if (isUpdated) updatedArtifact = windowsArtifact;
        return isUpdated;
      });

      updatedArtifact!.created = expectedArtifact.created;
      const bodyFormBuffer = Buffer.from(updatedArtifact!.body, 'base64');
      const unzippedBody = await unzipPromisify(bodyFormBuffer);

      // Check decoded body first to detect possible body changes
      expect(JSON.parse(unzippedBody.toString())).eql(expectedDecodedBodyArtifact);
      expect(updatedArtifact).eql(expectedArtifact);
    };

    const performActions = async (
      actions:
        | ArtifactActionsType['create']['formFields']
        | ArtifactActionsType['update']['formFields'],
      suffix?: string
    ) => {
      for (const formAction of actions) {
        if (formAction.type === 'customClick') {
          await find.clickByCssSelector(formAction.selector, testSubjects.FIND_TIME);
        } else if (formAction.type === 'click') {
          await testSubjects.click(formAction.selector);
        } else if (formAction.type === 'input') {
          await testSubjects.setValue(
            formAction.selector,
            (formAction.value || '') + (suffix ? suffix : '')
          );
        } else if (formAction.type === 'clear') {
          await (
            await (await testSubjects.find(formAction.selector)).findByCssSelector('button')
          ).click();
        }
      }
    };

    const deleteArtifact = async (actions: ArtifactActionsType) => {
      await pageObjects.artifactEntriesList.clickCardActionMenu(actions.pagePrefix);
      await testSubjects.click(`${actions.pagePrefix}-card-cardDeleteAction`);
      await testSubjects.click(`${actions.pagePrefix}-deleteModal-submitButton`);
      await testSubjects.waitForDeleted(actions.delete.confirmSelector);
    };

    const createArtifact = async (
      actions: ArtifactActionsType | MultipleArtifactActionsType,
      options?: { policyId?: string; suffix?: string; createButton?: string }
    ) => {
      // Opens add flyout
      if (options?.createButton) {
        await testSubjects.click(`${actions.pagePrefix}-${options.createButton}`);
      } else {
        await testSubjects.click(`${actions.pagePrefix}-emptyState-addButton`);
      }

      await performActions(actions.create.formFields, options?.suffix);

      if (options?.policyId) {
        await testSubjects.click(`${actions.pageObject}-form-effectedPolicies-perPolicy`);
        await testSubjects.click(`policy-${options.policyId}-checkbox`);
      }

      // Submit create artifact form
      await testSubjects.click(`${actions.pagePrefix}-flyout-submitButton`);
    };

    const updateArtifact = async (
      actions: ArtifactActionsType,
      options?: { policyId?: string; suffix?: string }
    ) => {
      // Opens edit flyout
      await pageObjects.artifactEntriesList.clickCardActionMenu(actions.pagePrefix);
      await testSubjects.click(`${actions.pagePrefix}-card-cardEditAction`);

      await performActions(actions.update.formFields);

      if (options?.policyId) {
        await testSubjects.click(`${actions.pageObject}-form-effectedPolicies-perPolicy`);
        await testSubjects.click(`policy-${options.policyId}-checkbox`);
      }

      // Submit edit artifact form
      await testSubjects.click(`${actions.pagePrefix}-flyout-submitButton`);
    };

    for (const testData of getArtifactsListTestsData()) {
      // FLAKY: https://github.com/elastic/kibana/issues/163140
      describe.skip(`When on the ${testData.title} entries list`, function () {
        beforeEach(async () => {
          policyInfo = await policyTestResources.createPolicy();
          await removeAllArtifacts();
          await browser.refresh();
          await pageObjects.artifactEntriesList.navigateToList(testData.urlPath);
        });

        afterEach(async () => {
          await removeAllArtifacts();
          if (policyInfo) {
            await policyInfo.cleanup();
          }
        });

        it(`should not show page title if there is no ${testData.title} entry`, async () => {
          await testSubjects.missingOrFail('header-page-title');
        });

        it(`should be able to add a new ${testData.title} entry`, async () => {
          await createArtifact(testData, { policyId: policyInfo.packagePolicy.id });
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
            testData.fleetArtifact.identifier,
            testData.fleetArtifact.getExpectedUpdatedtArtifactWhenCreate(),
            testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenCreate(),
            policyInfo
          );
        });

        it(`should be able to update an existing ${testData.title} entry`, async () => {
          await createArtifact(testData);
          await updateArtifact(testData, { policyId: policyInfo.packagePolicy.id });

          // Check edited artifact is in the list with new values (wait for list to be updated)
          await retry.waitForWithTimeout('entry is updated in list', 10000, async () => {
            const currentValue = await testSubjects.getVisibleText(
              `${testData.pagePrefix}-card-criteriaConditions${
                testData.pagePrefix === 'EventFiltersListPage' ? '-condition' : ''
              }`
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
            testData.fleetArtifact.identifier,
            testData.fleetArtifact.getExpectedUpdatedArtifactWhenUpdate(),
            testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenUpdate(),
            policyInfo
          );
        });

        it(`should be able to delete the existing ${testData.title} entry`, async () => {
          await createArtifact(testData);
          await deleteArtifact(testData);
          // We only expect one artifact to have been visible
          await testSubjects.missingOrFail(testData.delete.card);
          // Header has gone because there is no artifact
          await testSubjects.missingOrFail('header-page-title');
        });
      });
    }

    describe('Should check artifacts are correctly generated when multiple entries', function () {
      let firstPolicy: PolicyTestResourceInfo;
      let secondPolicy: PolicyTestResourceInfo;

      const firstSuffix = 'first';
      const secondSuffix = 'second';
      const thirdSuffix = 'third';

      beforeEach(async () => {
        firstPolicy = await policyTestResources.createPolicy();
        secondPolicy = await policyTestResources.createPolicy();
        await removeAllArtifacts();
        await browser.refresh();
        await pageObjects.artifactEntriesList.navigateToList(testData.urlPath);
      });

      afterEach(async () => {
        await removeAllArtifacts();
        if (firstPolicy) {
          await firstPolicy.cleanup();
        }
        if (secondPolicy) {
          await secondPolicy.cleanup();
        }
      });

      const testData = getCreateMultipleData();
      it(`should get correct atifact when multiple entries are created`, async () => {
        // Create first trusted app
        await createArtifact(testData, {
          policyId: firstPolicy.packagePolicy.id,
          suffix: firstSuffix,
        });
        await pageObjects.common.closeToast();

        // Create second trusted app
        await createArtifact(testData, {
          policyId: secondPolicy.packagePolicy.id,
          suffix: secondSuffix,
          createButton: 'pageAddButton',
        });
        await pageObjects.common.closeToast();

        // Create third trusted app
        await createArtifact(testData, { suffix: thirdSuffix, createButton: 'pageAddButton' });
        await pageObjects.common.closeToast();

        // Checks if fleet artifact has been updated correctly
        await checkFleetArtifacts(
          testData.fleetArtifact.identifier,
          testData.fleetArtifact.getExpectedUpdatedArtifactWhenCreateMultipleFirst(),
          testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenCreateMultipleFirst(
            thirdSuffix,
            firstSuffix
          ),
          firstPolicy
        );

        // Checks if fleet artifact has been updated correctly
        await checkFleetArtifacts(
          testData.fleetArtifact.identifier,
          testData.fleetArtifact.getExpectedUpdatedArtifactWhenCreateMultipleSecond(),
          testData.fleetArtifact.getExpectedUpdatedArtifactBodyWhenCreateMultipleSecond(
            thirdSuffix,
            secondSuffix
          ),
          secondPolicy
        );
      });
    });
  });
};
