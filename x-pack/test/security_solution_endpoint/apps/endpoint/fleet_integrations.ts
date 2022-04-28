/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  deleteMetadataStream,
  deleteAllDocsFromMetadataCurrentIndex,
} from '../../../security_solution_endpoint_api_int/apis/data_stream_helper';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { fleetIntegrations, trustedApps } = getPageObjects(['trustedApps', 'fleetIntegrations']);
  const policyTestResources = getService('policyTestResources');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('When in the Fleet application', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/endpoint/metadata/api_feature', {
        useCreate: true,
      });
      await browser.refresh();
    });
    after(async () => {
      await deleteMetadataStream(getService);
      await deleteAllDocsFromMetadataCurrentIndex(getService);
    });
    describe('and on the Endpoint Integration details page', () => {
      beforeEach(async () => {
        await fleetIntegrations.navigateToIntegrationDetails(
          await policyTestResources.getEndpointPkgKey()
        );
      });

      it('should show the Custom tab', async () => {
        await fleetIntegrations.integrationDetailCustomTabExistsOrFail();
      });

      it('should display the endpoint custom content', async () => {
        await (await fleetIntegrations.findIntegrationDetailCustomTab()).click();
        await testSubjects.existOrFail('fleetEndpointPackageCustomContent');
      });

      it('should show the Trusted Apps page when link is clicked', async () => {
        await (await fleetIntegrations.findIntegrationDetailCustomTab()).click();
        await (await testSubjects.find('trustedApps-artifactsLink')).click();
        await trustedApps.ensureIsOnTrustedAppsEmptyPage();
      });
    });
  });
}
