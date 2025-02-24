/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  users,
  roles,
  casesReadDeleteUser,
  casesAllUser,
  casesNoDeleteUser,
  casesReadAndEditSettingsUser,
} from '../common';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['security', 'header']);
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');

  describe('cases sub privilege', () => {
    before(async () => {
      await createUsersAndRoles(getService, users, roles);
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
      await cases.api.deleteAllCases();
      await PageObjects.security.forceLogout();
    });

    describe('cases_delete', () => {
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
              await testSubjects.click('property-actions-case-ellipses');
              await testSubjects.missingOrFail('property-actions-case-trash');
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

    describe('cases_settings', () => {
      afterEach(async () => {
        await cases.api.deleteAllCases();
      });

      for (const user of [casesReadAndEditSettingsUser, casesAllUser]) {
        describe(`logging in with user ${user.username}`, () => {
          before(async () => {
            await PageObjects.security.login(user.username, user.password);
          });

          after(async () => {
            await PageObjects.security.forceLogout();
          });

          it(`User ${user.username} can navigate to settings`, async () => {
            await cases.navigation.navigateToConfigurationPage();
          });

          it(`User ${user.username} can update settings`, async () => {
            await cases.common.selectRadioGroupValue(
              'closure-options-radio-group',
              'close-by-pushing'
            );
            const toast = await toasts.getElementByIndex(1);
            expect(await toast.getVisibleText()).to.be('Settings successfully updated');
            await toasts.dismissAll();
          });
        });
      }

      // below users do not have access to settings
      for (const user of [casesNoDeleteUser, casesReadDeleteUser]) {
        describe(`cannot access settings page with user ${user.username}`, () => {
          before(async () => {
            await PageObjects.security.login(user.username, user.password);
          });

          after(async () => {
            await PageObjects.security.forceLogout();
          });

          it(`User ${user.username} cannot navigate to settings`, async () => {
            await cases.navigation.navigateToApp();
            await testSubjects.missingOrFail('configure-case-button');
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
