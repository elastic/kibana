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
} from '../../../../rule_registry/common/lib/authentication';

import {
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
  observabilityMinReadAlertsAll,
  observabilityMinReadAlertsAllSpacesAll,
  observabilityMinimalAll,
  observabilityMinimalAllSpacesAll,
} from '../../../../rule_registry/common/lib/authentication/roles';
import {
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
  superUser,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinAll,
  obsMinAllSpacesAll,
} from '../../../../rule_registry/common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('timeline security and spaces enabled: trial', function () {
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
          superUser,
          obsMinReadAlertsAll,
          obsMinReadAlertsAllSpacesAll,
          obsMinAll,
          obsMinAllSpacesAll,
        ],
        [
          observabilityMinReadAlertsRead,
          observabilityMinReadAlertsReadSpacesAll,
          observabilityMinimalRead,
          observabilityMinimalReadSpacesAll,
          observabilityMinReadAlertsAll,
          observabilityMinReadAlertsAllSpacesAll,
          observabilityMinimalAll,
          observabilityMinimalAllSpacesAll,
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
          superUser,
          obsMinReadAlertsAll,
          obsMinReadAlertsAllSpacesAll,
          obsMinAll,
          obsMinAllSpacesAll,
        ],
        [
          observabilityMinReadAlertsRead,
          observabilityMinReadAlertsReadSpacesAll,
          observabilityMinimalRead,
          observabilityMinimalReadSpacesAll,
          observabilityMinReadAlertsAll,
          observabilityMinReadAlertsAllSpacesAll,
          observabilityMinimalAll,
          observabilityMinimalAllSpacesAll,
        ]
      );
    });

    // Trial
    loadTestFile(require.resolve('./events'));
  });
};
