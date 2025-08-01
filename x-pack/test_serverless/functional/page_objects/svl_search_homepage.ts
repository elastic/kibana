/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async expectToBeOnHomepage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/home');
    },
    async expectToBeOnStartpage() {
      expect(await browser.getCurrentUrl()).contain('/app/elasticsearch/start');
    },
    async expectToNotBeOnHomepage() {
      expect(await browser.getCurrentUrl()).not.contain('/app/elasticsearch/home');
    },
    async expectHomepageHeader() {
      await testSubjects.existOrFail('search-homepage-header', { timeout: 2000 });
    },
    async expectConsoleLinkExists() {
      await testSubjects.existOrFail('searchHomepageEmbeddedConsoleButton');
    },
    async clickConsoleLink() {
      await testSubjects.click('searchHomepageEmbeddedConsoleButton');
    },
    async expectEndpointsLinkExists() {
      await testSubjects.existOrFail('searchHomepageEndpointsHeaderActionEndpointsApiKeysButton');
    },
    async clickEndpointsLink() {
      await testSubjects.click('searchHomepageEndpointsHeaderActionEndpointsApiKeysButton');
    },
    async expectConnectionDetailsFlyoutToBeOpen() {
      await testSubjects.existOrFail('connectionDetailsModalTitle');
    },
    async closeConnectionDetailsFlyout() {
      await testSubjects.existOrFail('euiFlyoutCloseButton');
      await testSubjects.click('euiFlyoutCloseButton');
    },
    async expectEndpointsTabIsAvailable() {
      await testSubjects.existOrFail('connectionDetailsTabBtn-endpoints');
      await testSubjects.click('connectionDetailsTabBtn-endpoints');
      await testSubjects.existOrFail('connectionDetailsEsUrl');
      await testSubjects.existOrFail('connectionDetailsCloudIdSwitch');
    },
    async clickManageApiKeysLink() {
      await testSubjects.existOrFail('manageApiKeysButton');
      await testSubjects.click('manageApiKeysButton');
    },
    async expectToBeOnManageApiKeysPage() {
      expect(await browser.getCurrentUrl()).contain('/app/management/security/api_keys');
    },
    async expectToBeOnUploadDataPage() {
      expect(await browser.getCurrentUrl()).contain('ml/filedatavisualizer');
    },
    async expectToBeOnCustomerEngineerPage() {
      expect(await browser.getCurrentUrl()).contain('contact/ce-help');
    },
    async expectToBeOnCreateIndexPage() {
      expect(await browser.getCurrentUrl()).contain('app/elasticsearch/indices/create');
    },
    async expectToBeOnObservabilityPage() {
      expect(await browser.getCurrentUrl()).contain('manage-data/ingest');
    },
    async expectToBeOnIngestDataToSecurityPage() {
      expect(await browser.getCurrentUrl()).contain(
        'security/get-started/ingest-data-to-elastic-security'
      );
    },
    async expectToBeOnInstallElasticDefendPage() {
      expect(await browser.getCurrentUrl()).contain(
        'security/configure-elastic-defend/install-elastic-defend'
      );
    },
    async expectToBeOnCloudSecurityPosturePage() {
      expect(await browser.getCurrentUrl()).contain(
        'security/cloud/cloud-security-posture-management'
      );
    },
    async expectToBeOnSpacesCreatePage() {
      expect(await browser.getCurrentUrl()).contain('observability/start');
    },
    async expectToBeOnSearchLabsPage() {
      expect(await browser.getCurrentUrl()).contain('search-labs');
    },
    async expectToBeOnNotebooksExamplesPage() {
      expect(await browser.getCurrentUrl()).contain('search-labs/tutorials/examples');
    },
    async expectToBeOnGetStartedDocumentationPage() {
      expect(await browser.getCurrentUrl()).contain('docs/solutions/search/get-started');
    },
    async expectToBeOnCommunityPage() {
      expect(await browser.getCurrentUrl()).contain('community/');
    },
    async expectToBeOnGiveFeedbackPage() {
      expect(await browser.getCurrentUrl()).contain('kibana/feedback');
    },
    async createApiKeyInFlyout(keyName: string) {
      await testSubjects.existOrFail('connectionDetailsApiKeyNameInput');
      await testSubjects.existOrFail('connectionDetailsApiKeySubmitBtn');
      await testSubjects.setValue('connectionDetailsApiKeyNameInput', keyName);
      await testSubjects.click('connectionDetailsApiKeySubmitBtn');
      await testSubjects.existOrFail('connectionDetailsApiKeySuccessForm');
      await testSubjects.existOrFail('connectionDetailsApiKeyValueRow');
      expect(await testSubjects.getVisibleText('connectionDetailsApiKeySuccessForm')).contain(
        keyName
      );
    },
    async expectAIAssistantToExist() {
      await testSubjects.existOrFail('AiAssistantAppNavControlButton');
    },
  };
}
