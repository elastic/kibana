/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createSpaces,
  createUsersAndRoles,
  deleteSpaces,
  deleteUsersAndRoles,
} from '../../../common/lib/authentication';

import {
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
  observabilityOnlyAlertsRead,
  observabilityOnlyAlertsReadSpacesAll,
  observabilityMinReadAlertsAll,
  observabilityMinReadAlertsAllSpacesAll,
  observabilityMinimalAll,
  observabilityMinimalAllSpacesAll,
  observabilityOnlyAlertsAll,
  observabilityOnlyAlertsAllSpacesAll,
} from '../../../common/lib/authentication/roles';
import {
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
  obsAlertsRead,
  obsAlertsReadSpacesAll,
  superUser,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinAll,
  obsMinAllSpacesAll,
  obsAlertsAll,
  obsAlertsAllSpacesAll,
} from '../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('rules security and spaces enabled: basic', function () {
    // Fastest ciGroup for the moment.
    this.tags('ciGroup5');

    before(async () => {
      await createSpaces(getService);
      await createUsersAndRoles(
        getService,
        [
          obsMinReadAlertsRead,
          obsMinReadAlertsReadSpacesAll,
          obsMinRead,
          obsMinReadSpacesAll,
          obsAlertsRead,
          obsAlertsReadSpacesAll,
          superUser,
          obsMinReadAlertsAll,
          obsMinReadAlertsAllSpacesAll,
          obsMinAll,
          obsMinAllSpacesAll,
          obsAlertsAll,
          obsAlertsAllSpacesAll,
        ],
        [
          observabilityMinReadAlertsRead,
          observabilityMinReadAlertsReadSpacesAll,
          observabilityMinimalRead,
          observabilityMinimalReadSpacesAll,
          observabilityOnlyAlertsRead,
          observabilityOnlyAlertsReadSpacesAll,
          observabilityMinReadAlertsAll,
          observabilityMinReadAlertsAllSpacesAll,
          observabilityMinimalAll,
          observabilityMinimalAllSpacesAll,
          observabilityOnlyAlertsAll,
          observabilityOnlyAlertsAllSpacesAll,
        ]
      );
    });

    after(async () => {
      await deleteSpaces(getService);
      await deleteUsersAndRoles(
        getService,
        [
          obsMinReadAlertsRead,
          obsMinReadAlertsReadSpacesAll,
          obsMinRead,
          obsMinReadSpacesAll,
          obsAlertsRead,
          obsAlertsReadSpacesAll,
          superUser,
          obsMinReadAlertsAll,
          obsMinReadAlertsAllSpacesAll,
          obsMinAll,
          obsMinAllSpacesAll,
          obsAlertsAll,
          obsAlertsAllSpacesAll,
        ],
        [
          observabilityMinReadAlertsRead,
          observabilityMinReadAlertsReadSpacesAll,
          observabilityMinimalRead,
          observabilityMinimalReadSpacesAll,
          observabilityOnlyAlertsRead,
          observabilityOnlyAlertsReadSpacesAll,
          observabilityMinReadAlertsAll,
          observabilityMinReadAlertsAllSpacesAll,
          observabilityMinimalAll,
          observabilityMinimalAllSpacesAll,
          observabilityOnlyAlertsAll,
          observabilityOnlyAlertsAllSpacesAll,
        ]
      );
    });

    // Basic
    loadTestFile(require.resolve('./get_alerts'));
    loadTestFile(require.resolve('./update_alert'));
  });
};
