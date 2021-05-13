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
  updateConfiguration,
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

  describe('patch_configure', () => {
    const actionsRemover = new ActionsRemover(supertest);

    afterEach(async () => {
      await deleteConfiguration(es);
      await actionsRemover.removeAll();
    });

    it('User: security solution only - should update a configuration', async () => {
      const configuration = await createConfiguration(
        supertestWithoutAuth,
        getConfigurationRequest(),
        200,
        secOnlyDefaultSpaceAuth
      );

      const newConfiguration = await updateConfiguration(
        supertestWithoutAuth,
        configuration.id,
        {
          closure_type: 'close-by-pushing',
          version: configuration.version,
        },
        200,
        secOnlyDefaultSpaceAuth
      );

      expect(newConfiguration.owner).to.eql('securitySolutionFixture');
    });

    it('User: security solution only - should NOT update a configuration of different owner', async () => {
      const configuration = await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'observabilityFixture' },
        200,
        superUserDefaultSpaceAuth
      );

      await updateConfiguration(
        supertestWithoutAuth,
        configuration.id,
        {
          closure_type: 'close-by-pushing',
          version: configuration.version,
        },
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
      } with role(s) ${user.roles.join()} - should NOT update a configuration`, async () => {
        const configuration = await createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest(),
          200,
          superUserDefaultSpaceAuth
        );

        await updateConfiguration(
          supertestWithoutAuth,
          configuration.id,
          {
            closure_type: 'close-by-pushing',
            version: configuration.version,
          },
          403,
          {
            user,
            space: null,
          }
        );
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      const configuration = await createConfiguration(
        supertestWithoutAuth,
        { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
        200,
        superUserDefaultSpaceAuth
      );

      await updateConfiguration(
        supertestWithoutAuth,
        configuration.id,
        {
          closure_type: 'close-by-pushing',
          version: configuration.version,
        },
        404,
        {
          user: secOnlySpacesAll,
          space: 'space1',
        }
      );
    });
  });
};
