/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { users, roles, casesReadDeleteUser, casesAllUser, casesNoDeleteUser } from './common';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['security', 'header']);
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');

  // Failing: See https://github.com/elastic/kibana/issues/145271
  describe.skip('cases deletion sub privilege', () => {
    before(async () => {
      await createUsersAndRoles(getService, users, roles);
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
      await cases.api.deleteAllCases();
      await PageObjects.security.forceLogout();
    });

    describe('create two cases', () => {
      beforeEach(async () => {
        await cases.api.createNthRandomCases(2);
      });

      afterEach(async () => {
        await cases.api.deleteAllCases();
      });

      for (const user of [casesReadDeleteUser, casesAllUser]) {
        describe(`logging in with user ${user.username}`, () => {
          before(async () => {
            await PageObjects.security.login(user.username, user.password);
          });

          beforeEach(async () => {
            await navigateToCasesAndWaitToLoad(getService);
          });

          after(async () => {
            await PageObjects.security.forceLogout();
          });

          describe('single case view', () => {
            beforeEach(async () => {
              await cases.casesTable.goToFirstListedCase();
            });

            it(`User ${user.username} can delete a case while on a specific case page`, async () => {
              await cases.singleCase.deleteCase();
              await cases.casesTable.waitForTableToFinishLoading();
              await cases.casesTable.validateCasesTableHasNthRows(1);
            });
          });

          describe('all cases list page', () => {
            it(`User ${user.username} can bulk delete cases`, async () => {
              await cases.casesTable.selectAndDeleteAllCases();
              await cases.casesTable.waitForTableToFinishLoading();
              await cases.casesTable.validateCasesTableHasNthRows(0);
            });

            it(`User ${user.username} can delete a case using the row actions`, async () => {
              await cases.casesTable.deleteCase(0);
              await cases.casesTable.waitForTableToFinishLoading();
              await cases.casesTable.validateCasesTableHasNthRows(1);
            });
          });
        });
      }

      for (const user of [casesNoDeleteUser]) {
        describe(`logging in with user ${user.username}`, () => {
          before(async () => {
            await PageObjects.security.login(user.username, user.password);
          });

          beforeEach(async () => {
            await navigateToCasesAndWaitToLoad(getService);
          });

          after(async () => {
            await PageObjects.security.forceLogout();
          });

          describe('single case view', () => {
            beforeEach(async () => {
              await cases.casesTable.goToFirstListedCase();
            });

            it(`User ${user.username} cannot delete a case while on a specific case page`, async () => {
              await testSubjects.missingOrFail('case-view-actions');
            });
          });

          describe('all cases list page', () => {
            it(`User ${user.username} cannot delete cases using individual row actions`, async () => {
              await cases.casesTable.openRowActions(0);
              await testSubjects.missingOrFail('cases-bulk-action-delete');
            });

            it(`User ${user.username} cannot delete cases using bulk actions or individual row trash icon`, async () => {
              await cases.casesTable.selectAllCasesAndOpenBulkActions();
              await testSubjects.missingOrFail('cases-bulk-action-delete');
            });
          });
        });
      }
    });
  });
};

const navigateToCasesAndWaitToLoad = async (getService: FtrProviderContext['getService']) => {
  const cases = getService('cases');

  await cases.navigation.navigateToApp();
  await cases.casesTable.waitForCasesToBeListed();
  await cases.casesTable.waitForTableToFinishLoading();
};
