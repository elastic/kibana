/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import {
  getConfigurationRequest,
  removeServerGeneratedPropertiesFromSavedObject,
  getConfigurationOutput,
  deleteConfiguration,
  createConfiguration,
  getConfiguration,
  ensureSavedObjectIsAuthorized,
} from '../../../../common/lib/utils';

import {
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  globalRead,
  obsSecRead,
  superUser,
  testDisabled,
} from '../../../../common/lib/authentication/users';

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

    it('should create a configuration', async () => {
      const configuration = await createConfiguration(supertest);

      const data = removeServerGeneratedPropertiesFromSavedObject(configuration);
      expect(data).to.eql(getConfigurationOutput());
    });

    it('should keep only the latest configuration', async () => {
      await createConfiguration(supertest, getConfigurationRequest({ id: 'connector-2' }));
      await createConfiguration(supertest);
      const configuration = await getConfiguration({ supertest });

      expect(configuration.length).to.be(1);
    });

    it('should return an empty mapping when they type is none', async () => {
      const postRes = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'not-exists',
          name: 'not-exists',
          type: ConnectorTypes.none,
        })
      );

      expect(postRes.mappings).to.eql([]);
    });

    it('should return the correct mapping for Jira', async () => {
      const postRes = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'jira',
          name: 'Jira',
          type: ConnectorTypes.jira,
        })
      );

      expect(postRes.mappings).to.eql([
        {
          action_type: 'overwrite',
          source: 'title',
          target: 'summary',
        },
        {
          action_type: 'overwrite',
          source: 'description',
          target: 'description',
        },
        {
          action_type: 'append',
          source: 'comments',
          target: 'comments',
        },
      ]);
    });

    it('should return the correct mapping for IBM Resilient', async () => {
      const postRes = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'resilient',
          name: 'Resilient',
          type: ConnectorTypes.resilient,
        })
      );

      expect(postRes.mappings).to.eql([
        {
          action_type: 'overwrite',
          source: 'title',
          target: 'name',
        },
        {
          action_type: 'overwrite',
          source: 'description',
          target: 'description',
        },
        {
          action_type: 'append',
          source: 'comments',
          target: 'comments',
        },
      ]);
    });

    it('should return the correct mapping for ServiceNow ITSM', async () => {
      const postRes = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'serviceNowITSM',
          name: 'ServiceNow ITSM',
          type: ConnectorTypes.serviceNowITSM,
        })
      );

      expect(postRes.mappings).to.eql([
        {
          action_type: 'overwrite',
          source: 'title',
          target: 'short_description',
        },
        {
          action_type: 'overwrite',
          source: 'description',
          target: 'description',
        },
        {
          action_type: 'append',
          source: 'comments',
          target: 'work_notes',
        },
      ]);
    });

    it('should return the correct mapping for ServiceNow SecOps', async () => {
      const postRes = await createConfiguration(
        supertest,
        getConfigurationRequest({
          id: 'serviceNowSIR',
          name: 'ServiceNow SecOps',
          type: ConnectorTypes.serviceNowSIR,
        })
      );

      expect(postRes.mappings).to.eql([
        {
          action_type: 'overwrite',
          source: 'title',
          target: 'short_description',
        },
        {
          action_type: 'overwrite',
          source: 'description',
          target: 'description',
        },
        {
          action_type: 'append',
          source: 'comments',
          target: 'work_notes',
        },
      ]);
    });

    it('should not create a configuration when missing connector.id', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            name: 'Connector',
            type: ConnectorTypes.none,
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.name', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.type', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            name: 'Connector',
            fields: null,
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when missing connector.fields', async () => {
      await createConfiguration(
        supertest,
        {
          // @ts-expect-error
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when when missing closure_type', async () => {
      await createConfiguration(
        supertest,
        // @ts-expect-error
        {
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
            fields: null,
          },
        },
        400
      );
    });

    it('should not create a configuration when missing connector', async () => {
      await createConfiguration(
        supertest,
        // @ts-expect-error
        {
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration when fields are not null', async () => {
      await createConfiguration(
        supertest,
        {
          connector: {
            id: 'test-id',
            type: ConnectorTypes.none,
            name: 'Connector',
            // @ts-expect-error
            fields: {},
          },
          closure_type: 'close-by-user',
        },
        400
      );
    });

    it('should not create a configuration with unsupported connector type', async () => {
      // @ts-expect-error
      await createConfiguration(supertest, getConfigurationRequest({ type: '.unsupported' }), 400);
    });

    it('should not create a configuration with unsupported connector fields', async () => {
      await createConfiguration(
        supertest,
        // @ts-expect-error
        getConfigurationRequest({ type: '.jira', fields: { unsupported: 'value' } }),
        400
      );
    });

    describe('rbac', () => {
      it('returns a 403 when attempting to create a configuration with an owner that was from a disabled feature in the space', async () => {
        const configuration = (await createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest({ overrides: { owner: 'testDisabledFixture' } }),
          403,
          {
            user: testDisabled,
            space: 'space1',
          }
        )) as unknown as { message: string };

        expect(configuration.message).to.eql(
          'Unauthorized to create case configuration with owners: "testDisabledFixture"'
        );
      });

      it('User: security solution only - should create a configuration', async () => {
        const configuration = await createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest(),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        expect(configuration.owner).to.eql('securitySolutionFixture');
      });

      it('User: security solution only - should NOT create a configuration of different owner', async () => {
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          403,
          {
            user: secOnly,
            space: 'space1',
          }
        );
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT create a configuration`, async () => {
          await createConfiguration(
            supertestWithoutAuth,
            { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
            403,
            {
              user,
              space: 'space1',
            }
          );
        });
      }

      it('should NOT create a configuration in a space with no permissions', async () => {
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
          403,
          {
            user: secOnly,
            space: 'space2',
          }
        );
      });

      it('it deletes the correct configurations', async () => {
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'securitySolutionFixture' },
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        /**
         * This API call should not delete the previously created configuration
         * as it belongs to a different owner
         */
        await createConfiguration(
          supertestWithoutAuth,
          { ...getConfigurationRequest(), owner: 'observabilityFixture' },
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        const configuration = await getConfiguration({
          supertest: supertestWithoutAuth,
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
          auth: {
            user: superUser,
            space: 'space1',
          },
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
  });
};
