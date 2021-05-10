/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { getPostCaseRequest } from '../../../../common/lib/mock';
import { deleteCasesByESQuery, createCase } from '../../../../common/lib/utils';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
} from '../../../../common/lib/authentication/users';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { secOnlyDefaultSpaceAuth, superUserDefaultSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('post_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('User: security solution only - should create a case', async () => {
      const theCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        200,
        secOnlyDefaultSpaceAuth
      );
      expect(theCase.owner).to.eql('securitySolutionFixture');
    });

    it('User: security solution only - should NOT create a case of different owner', async () => {
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        403,
        secOnlyDefaultSpaceAuth
      );
    });

    for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT create a case`, async () => {
        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          403,
          superUserDefaultSpaceAuth
        );
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        404,
        {
          user: secOnly,
          space: 'space1',
        }
      );
    });
  });
};
