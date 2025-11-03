/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchHomePage',
    'embeddedConsole',
    'common',
    'apiKeys',
    'searchGettingStarted',
  ]);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Search Getting Started page', function () {
    describe('as viewer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
      });

      beforeEach(async () => {
        await browser.execute(() => window.localStorage.clear());
      });

      describe('Getting Started redirect flow', function () {
        it('redirects to Getting Started on first load', async () => {
          await pageObjects.common.navigateToApp('searchHomepage', {
            shouldLoginIfPrompted: false,
          });
          await pageObjects.searchGettingStarted.expectToBeOnGettingStartedPage();
        });
        it('loads home page if localStorage key is set', async () => {
          await browser.refresh();
          await pageObjects.common.navigateToApp('searchHomepage', {
            shouldLoginIfPrompted: false,
          });
          await pageObjects.searchHomePage.expectToBeOnHomepage();
        });
      });

      describe('Getting Started page', function () {
        beforeEach(async () => {
          await pageObjects.common.navigateToApp('searchGettingStarted');
        });

        it('load search getting started', async () => {
          await pageObjects.searchGettingStarted.expectSearchGettingStartedIsLoaded();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });
      });

      describe('Getting Started page interactions', function () {
        beforeEach(async () => {
          await pageObjects.common.navigateToApp('searchGettingStarted');
        });

        describe('Add data button', function () {
          it('navigates to the upload file page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedUploadMenuItem'
            );
            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/tutorial_directory/fileDataViz');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
          it('navigates to the sample data page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedSampleDataMenuItem'
            );
            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/tutorial_directory/sampleData');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
          it('navigates to the empty index page when option is selected', async () => {
            await pageObjects.searchGettingStarted.selectAddDataOption(
              'gettingStartedCreateIndexMenuItem'
            );

            await retry.tryWithRetries(
              'wait for URL to change',
              async () => {
                expect(await browser.getCurrentUrl()).to.contain('/indices/create');
              },
              { initialDelay: 200, retryCount: 5, retryDelay: 500 }
            );
          });
        });

        describe('Skip and go to Home button', function () {
          it('navigates to the home page when clicked', async () => {
            await testSubjects.click('skipAndGoHomeBtn');
            await pageObjects.searchHomePage.expectToBeOnHomepage();
          });
        });

        describe('Elasticsearch endpoint and API Keys', function () {
          it('renders endpoint field and copy button', async () => {
            await testSubjects.existOrFail('endpointValueField');
            await testSubjects.existOrFail('copyEndpointButton');
            const endpointValue = await testSubjects.getVisibleText('endpointValueField');
            expect(endpointValue).to.contain('https://');
            await testSubjects.existOrFail('apiKeyFormNoUserPrivileges');
          });
        });

        describe('View connection details', function () {
          it('renders the view connection details button', async () => {
            await testSubjects.existOrFail('viewConnectionDetailsLink');
          });
          it('opens the connection flyout when the button is clicked', async () => {
            await testSubjects.click('viewConnectionDetailsLink');
            await testSubjects.existOrFail('connectionDetailsModalTitle');
          });
        });

        describe('Explore the API', function () {
          it('clicking on search basics tutorial opens console', async () => {
            await pageObjects.searchGettingStarted.expectConsoleTutorial(
              'consoleTutorialsSearchBasics'
            );
          });
          it('clicking on semantic search tutorial open console', async () => {
            await pageObjects.searchGettingStarted.expectConsoleTutorial(
              'consoleTutorialsSemanticSearch'
            );
          });
          it('clicking on esql tutorial open console', async () => {
            await pageObjects.searchGettingStarted.expectConsoleTutorial('consoleTutorialsEsql');
          });
        });

        describe('Connect to your application', function () {
          it('renders the JavaScript code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('javascript');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue(
              'import { Client } from'
            );
          });
          it('renders the cURL code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('curl');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue('curl -X PUT');
          });
          it('renders the Python code example when selected in Language Selector', async () => {
            await pageObjects.searchGettingStarted.selectCodingLanguage('python');
            await pageObjects.searchGettingStarted.expectCodeSampleContainsValue(
              'from elasticsearch import'
            );
          });
        });

        describe('Footer content', function () {
          it('renders Search Labs callout and navigates correctly', async () => {
            await pageObjects.searchGettingStarted.expectFooterCallout(
              'gettingStartedSearchLabs',
              'search-labs'
            );
          });
          it('renders Python Notebooks callout and navigates correctly', async () => {
            await pageObjects.searchGettingStarted.expectFooterCallout(
              'gettingStartedOpenNotebooks',
              'search-labs/tutorials/examples'
            );
          });
          it('renders Elasticsearch Documentation callout and navigates correctly', async () => {
            await pageObjects.searchGettingStarted.expectFooterCallout(
              'gettingStartedViewDocumentation',
              'docs/solutions/search/get-started'
            );
          });
        });
      });
    });
  });
}
