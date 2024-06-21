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
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { ArtifactElasticsearchProperties } from '@kbn/fleet-plugin/server/services';
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../configs/ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'header', 'timePicker']);
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const endpointTestResources = getService('endpointTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const retry = getService('retry');
  const esClient = getService('es');
  const supertest = getService('supertest');
  const find = getService('find');
  const unzipPromisify = promisify(unzip);
  const comboBox = getService('comboBox');
  const toasts = getService('toasts');
  const MINUTES = 60 * 1000 * 10;

  describe('@ess @serverless Endpoint Exceptions', function () {
    const clearPrefilledEntries = async () => {
      const entriesContainer = await testSubjects.find('exceptionEntriesContainer');

      let deleteButtons: WebElementWrapper[];
      do {
        deleteButtons = await testSubjects.findAllDescendant(
          'builderItemEntryDeleteButton',
          entriesContainer
        );

        await deleteButtons[0].click();
      } while (deleteButtons.length > 1);
    };

    const openNewEndpointExceptionFlyout = async () => {
      await testSubjects.scrollIntoView('timeline-context-menu-button');
      await testSubjects.click('timeline-context-menu-button');
      await testSubjects.click('add-endpoint-exception-menu-item');
      await testSubjects.existOrFail('addExceptionFlyout');

      await retry.waitFor('entries should be loaded', () =>
        testSubjects.exists('exceptionItemEntryContainer')
      );
    };

    const setLastFieldsValue = async ({
      testSubj,
      value,
    }: {
      testSubj: string;
      value: string;
      optionSelector?: string;
    }) => {
      const fields = await find.allByCssSelector(`[data-test-subj="${testSubj}"]`);

      const lastField = fields[fields.length - 1];
      await lastField.click();

      await retry.try(
        async () => {
          await comboBox.setElement(lastField, value);
        },
        async () => {
          // If the above fails due to an option not existing, create the value custom instead
          await comboBox.setFilterValue(lastField, value);
          await pageObjects.common.pressEnterKey();
        }
      );
    };

    const setLastEntry = async ({
      field,
      operator,
      value,
    }: {
      field: string;
      operator: 'matches' | 'is';
      value: string;
    }) => {
      await setLastFieldsValue({ testSubj: 'fieldAutocompleteComboBox', value: field });
      await setLastFieldsValue({ testSubj: 'operatorAutocompleteComboBox', value: operator });
      await setLastFieldsValue({
        testSubj: operator === 'matches' ? 'valuesAutocompleteWildcard' : 'valuesAutocompleteMatch',
        value,
      });
    };

    const checkArtifact = (expectedArtifact: object) => {
      return retry.tryForTime(2 * MINUTES, async () => {
        const artifacts = await endpointArtifactTestResources.getArtifactsFromUnifiedManifestSO();

        const foundArtifactId = artifacts
          .flatMap((artifact) => artifact.artifactIds)
          .find((artifactId) => artifactId.startsWith('endpoint-exceptionlist-macos-v1'));

        expect(foundArtifactId).to.not.be(undefined);

        // Get fleet artifact
        const artifactResult = await esClient.get({
          index: '.fleet-artifacts-7',
          id: `endpoint:${foundArtifactId!}`,
        });

        const artifact = artifactResult._source as ArtifactElasticsearchProperties;

        const zippedBody = Buffer.from(artifact.body, 'base64');
        const artifactBody = await unzipPromisify(zippedBody);

        expect(JSON.parse(artifactBody.toString())).to.eql(expectedArtifact);
      });
    };

    let indexedData: IndexedHostsAndAlertsResponse;
    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData();

      const waitForAlertsToAppear = async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('security', `/alerts`);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');
        await retry.waitForWithTimeout('alerts to appear', 10 * MINUTES, async () => {
          await queryBar.clickQuerySubmitButton();
          return testSubjects.exists('timeline-context-menu-button');
        });
      };

      await waitForAlertsToAppear();
    });

    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
    });

    beforeEach(async () => {
      const deleteEndpointExceptions = async () => {
        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=endpoint_list&namespace_type=agnostic`)
          .set('kbn-xsrf', 'true');

        for (const exceptionListItem of (body as FoundExceptionListItemSchema).data) {
          await supertest
            .delete(`${EXCEPTION_LIST_ITEM_URL}?id=${exceptionListItem.id}&namespace_type=agnostic`)
            .set('kbn-xsrf', 'true');
        }
      };

      await deleteEndpointExceptions();
    }, MINUTES);

    it(
      'should add `event.module=endpoint` to entry if only wildcard operator is present',
      async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('security', `/alerts`);
        await pageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');

        await openNewEndpointExceptionFlyout();
        await clearPrefilledEntries();

        await testSubjects.setValue('exceptionFlyoutNameInput', 'test exception');
        await setLastEntry({ field: 'file.path', operator: 'matches', value: '*/cheese/*' });
        await testSubjects.click('exceptionsAndButton');
        await setLastEntry({ field: 'process.executable', operator: 'matches', value: 'ex*' });

        await testSubjects.click('addExceptionConfirmButton');
        await toasts.dismiss();

        await checkArtifact({
          entries: [
            {
              type: 'simple',
              entries: [
                {
                  field: 'file.path',
                  operator: 'included',
                  type: 'wildcard_cased',
                  value: '*/cheese/*',
                },
                {
                  field: 'process.executable',
                  operator: 'included',
                  type: 'wildcard_cased',
                  value: 'ex*',
                },
                {
                  // this additional entry should be added
                  field: 'event.module',
                  operator: 'included',
                  type: 'exact_cased',
                  value: 'endpoint',
                },
              ],
            },
          ],
        });
      },
      MINUTES
    );

    it(
      'should NOT add `event.module=endpoint` to entry if there is another operator',
      async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory('security', `/alerts`);
        await pageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');

        await openNewEndpointExceptionFlyout();
        await clearPrefilledEntries();

        await testSubjects.setValue('exceptionFlyoutNameInput', 'test exception');
        await setLastEntry({ field: 'file.path', operator: 'matches', value: '*/cheese/*' });
        await testSubjects.click('exceptionsAndButton');
        await setLastEntry({ field: 'process.executable', operator: 'is', value: 'something' });

        await testSubjects.click('addExceptionConfirmButton');
        await toasts.dismiss();

        await checkArtifact({
          entries: [
            {
              type: 'simple',
              entries: [
                {
                  field: 'file.path',
                  operator: 'included',
                  type: 'wildcard_cased',
                  value: '*/cheese/*',
                },
                {
                  field: 'process.executable',
                  operator: 'included',
                  type: 'exact_cased',
                  value: 'something',
                },
              ],
            },
          ],
        });
      },
      MINUTES
    );
  });
};
