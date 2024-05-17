/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createSpaces,
  createUsersAndRoles,
  deleteSpaces,
  deleteUsersAndRoles,
} from '../../../../rule_registry/common/lib/authentication';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import {
  observabilityMinReadAlertsAll,
  observabilityMinReadAlertsAllSpacesAll,
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalAll,
  observabilityMinimalAllSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
} from '../../../../rule_registry/common/lib/authentication/roles';
import {
  obsMinAll,
  obsMinAllSpacesAll,
  obsMinRead,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinReadSpacesAll,
  superUser,
} from '../../../../rule_registry/common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('timeline security and spaces enabled: trial', function () {
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
