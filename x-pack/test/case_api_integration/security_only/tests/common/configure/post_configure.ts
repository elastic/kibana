/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import {
  getConfigurationRequest,
  deleteConfiguration,
  createConfiguration,
  getConfiguration,
  ensureSavedObjectIsAuthorized,
} from '../../../../common/lib/utils';

import {
  secOnlySpacesAll,
  obsOnlyReadSpacesAll,
  secOnlyReadSpacesAll,
  noKibanaPrivileges,
  globalRead,
  obsSecReadSpacesAll,
} from '../../../../common/lib/authentication/users';
import { secOnlyDefaultSpaceAuth, superUserDefaultSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('post_configure', () => {
    const actionsRemover = new ActionsRemover(supertest);

    afterEach(async () => {
      await deleteConfiguration(es);
      await actionsRemover.removeAll();
    });

    it('User: security solution only - should create a configuration', async () => {
      const configuration = await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      expect(configuration.owner).to.eql('securitySolutionFixture');
    });

    it('User: security solution only - should NOT create a configuration of different owner', async () => {
      await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'observabilityFixture' },
        403,
        secOnlyDefaultSpaceAuth
      );
    });

    for (const user of [
      globalRead,
      secOnlyReadSpacesAll,
      obsOnlyReadSpacesAll,
      obsSecReadSpacesAll,
      noKibanaPrivileges,
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT create a configuration`, async () => {
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
          403,
          {
            user,
            space: null,
          }
        );
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
        404,
        {
          user: secOnlySpacesAll,
          space: 'space1',
        }
      );
    });

    it('it deletes the correct configurations', async () => {
      await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
        200,
        superUserDefaultSpaceAuth
      );

      /**
       * This API call should not delete the previously created configuration
       * as it belongs to a different owner
       */
      await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'observabilityFixture' },
        200,
        superUserDefaultSpaceAuth
      );

      const configuration = await getConfiguration({
        supertest: supertestWithoutAuth,
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        auth: superUserDefaultSpaceAuth,
      });

      /**
       * This ensures that both configuration are returned as expected
       * and neither of has been deleted
       */
      ensureSavedObjectIsAuthorized(configuration, 2, [
        'securitySolutionFixture',
        'observabilityFixture',
      ]);
    });
  });
};
