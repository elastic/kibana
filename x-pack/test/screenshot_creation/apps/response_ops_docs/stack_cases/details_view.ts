/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { createAndUploadFile } from '../../../../cases_api_integration/common/lib/api';
import { CASES_FILE_KIND } from '../../../../cases_api_integration/common/lib/constants';

export default function ({ getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const testSubjects = getService('testSubjects');

  const screenshotDirectories = ['response_ops_docs', 'stack_cases'];
  const supertest = getService('supertest');
  let CASE_ID: string;
  let CASE_OWNER: string;

  describe('details view', function () {
    before(async () => {
      const testCase = await cases.api.createCase({
        title: 'Web transactions',
        tags: ['e-commerce'],
        description: 'Investigate e-commerce sample data.',
      });
      CASE_ID = testCase.id;
      CASE_OWNER = testCase.owner;

      await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: CASES_FILE_KIND,
          mimeType: 'image/png',
          meta: {
            caseIds: [CASE_ID],
            owner: [CASE_OWNER],
          },
        },
        data: 'abc',
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('case files screenshot', async () => {
      await cases.navigation.navigateToApp();
      await cases.navigation.navigateToSingleCase('cases', CASE_ID);
      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await commonScreenshots.takeScreenshot('cases-files', screenshotDirectories, 1400, 1024);
    });

    it('cases visualization screenshot', async () => {
      await cases.navigation.navigateToApp();
      await cases.navigation.navigateToSingleCase('cases', CASE_ID);
      await cases.singleCase.addVisualizationToNewComment('[Logs] Bytes distribution');

      await cases.singleCase.openVisualizationButtonTooltip();
      await commonScreenshots.takeScreenshot(
        'cases-visualization',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
