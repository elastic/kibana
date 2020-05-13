/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint', 'endpointPolicy']);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');

  describe('When on the Endpoint Policy Details Page', function() {
    this.tags(['ciGroup7']);

    describe('with an invalid policy id', () => {
      it('should display an error', async () => {
        await pageObjects.endpointPolicy.navigateToPolicyDetails('invalid-id');
        await testSubjects.existOrFail('policyDetailsIdNotFoundMessage');
        expect(await testSubjects.getVisibleText('policyDetailsIdNotFoundMessage')).to.equal(
          'Saved object [ingest-datasources/invalid-id] not found'
        );
      });
    });

    describe('with a valid policy id', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.endpointPolicy.navigateToPolicyDetails(policyInfo.datasource.id);
      });

      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should display policy view', async () => {
        expect(await testSubjects.getVisibleText('pageViewHeaderLeftTitle')).to.equal(
          policyInfo.datasource.name
        );
      });

      describe('and the save button is clicked', () => {
        it('should display success toast on successful save', async () => {
          await pageObjects.endpoint.clickOnEuiCheckbox('policyWindowsEvent_dns');
          await pageObjects.endpointPolicy.confirmAndSave();

          await testSubjects.existOrFail('policyDetailsSuccessMessage');
          expect(await testSubjects.getVisibleText('policyDetailsSuccessMessage')).to.equal(
            `Policy ${policyInfo.datasource.name} has been updated.`
          );
        });
        it('should persist update', async () => {
          await pageObjects.endpoint.clickOnEuiCheckbox('policyWindowsEvent_process');
          await pageObjects.endpointPolicy.confirmAndSave();

          await testSubjects.existOrFail('policyDetailsSuccessMessage');
          await pageObjects.endpointPolicy.navigateToPolicyList();
          await pageObjects.endpointPolicy.navigateToPolicyDetails(policyInfo.datasource.id);

          expect(
            await (await testSubjects.find('policyWindowsEvent_process')).isSelected()
          ).to.equal(false);
        });
      });
    });
  });
}
