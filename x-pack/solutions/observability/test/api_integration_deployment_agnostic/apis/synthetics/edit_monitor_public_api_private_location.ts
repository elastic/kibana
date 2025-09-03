/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import rawExpect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import moment from 'moment';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { LOCATION_REQUIRED_ERROR } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/monitor_validation';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('EditMonitorsPublicAPI - Private Location', function () {
    const supertestAPI = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const testPrivateLocations = new PrivateLocationTestService(getService);
    let editorUser: RoleCredentials;
    let privateLocation1: PrivateLocation;
    let privateLocation2: PrivateLocation;

    async function addMonitorAPI(monitor: any, statusCode: number = 200) {
      return await addMonitorAPIHelper(supertestAPI, monitor, statusCode, editorUser, samlAuth);
    }

    async function editMonitorAPI(id: string, monitor: any, statusCode: number = 200) {
      return await editMonitorAPIHelper(id, monitor, statusCode);
    }

    async function editMonitorAPIHelper(monitorId: string, monitor: any, statusCode = 200) {
      const result = await supertestAPI
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);

      expect(result.status).eql(statusCode, JSON.stringify(result.body));

      if (statusCode === 200) {
        const {
          created_at: createdAt,
          updated_at: updatedAt,
          id,
          config_id: configId,
        } = result.body;
        expect(id).not.empty();
        expect(configId).not.empty();
        expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
        return {
          rawBody: result.body,
          body: {
            ...omit(result.body, [
              'created_at',
              'updated_at',
              'id',
              'config_id',
              'form_monitor_type',
            ]),
          },
        };
      }
      return result.body;
    }

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await testPrivateLocations.installSyntheticsPackage();
      privateLocation1 = await testPrivateLocations.addTestPrivateLocation();
      privateLocation2 = await testPrivateLocations.addTestPrivateLocation();
    });

    after(async () => {
      // await kibanaServer.savedObjects.cleanStandardList();
    });
    let monitorId = 'test-id';

    const defaultFields = DEFAULT_FIELDS.http;

    it('adds test monitor', async () => {
      const monitor = {
        type: 'http',
        private_locations: [privateLocation1.id],
        url: 'https://www.google.com',
      };
      const { body: result, rawBody } = await addMonitorAPI(monitor);
      monitorId = rawBody.id;

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          locations: [privateLocation1],
          name: 'https://www.google.com',
          spaces: ['default'],
        })
      );
    });

    it('should return error for empty monitor', async function () {
      const errMessage = 'Monitor must be a non-empty object';
      const testCases = [{}, null, undefined, false, [], ''];
      for (const testCase of testCases) {
        const { message } = await editMonitorAPI(monitorId, testCase, 400);
        expect(message).eql(errMessage);
      }
    });

    it('return error if type is being changed', async () => {
      const { message } = await editMonitorAPI(monitorId, { type: 'tcp' }, 400);
      expect(message).eql('Monitor type cannot be changed from http to tcp.');
    });

    it('return error if monitor not found', async () => {
      const { message } = await editMonitorAPI('invalid-monitor-id', { type: 'tcp' }, 404);
      expect(message).eql('Monitor id invalid-monitor-id not found!');
    });

    it('return error if invalid location specified', async () => {
      const { message } = await editMonitorAPI(
        monitorId,
        { type: 'http', locations: ['mars'] },
        400
      );
      rawExpect(message).toContain(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found."
      );
    });

    it('return error if invalid private location specified', async () => {
      const { message } = await editMonitorAPI(
        monitorId,
        {
          type: 'http',
          locations: ['mars'],
          privateLocations: ['moon'],
        },
        400
      );
      expect(message).eql('Invalid monitor key(s) for http type:  privateLocations');

      const result = await editMonitorAPI(
        monitorId,
        {
          type: 'http',
          locations: ['mars'],
          private_locations: ['moon'],
        },
        400
      );
      rawExpect(result.message).toContain("Private Location(s) 'moon' not found.");
    });

    it('throws an error if empty locations', async () => {
      const monitor = {
        locations: [],
        private_locations: [],
      };
      const { message } = await editMonitorAPI(monitorId, monitor, 400);

      expect(message).eql(LOCATION_REQUIRED_ERROR);
    });

    it('cannot change origin type', async () => {
      const monitor = {
        origin: 'project',
      };
      const result = await editMonitorAPI(monitorId, monitor, 400);

      expect(result).eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unsupported origin type project, only ui type is supported via API.',
        attributes: {
          details: 'Unsupported origin type project, only ui type is supported via API.',
          payload: { origin: 'project' },
        },
      });
    });

    const updates: any = {};

    it('can change name of monitor', async () => {
      updates.name = `updated name ${uuidv4()}`;
      const monitor = {
        name: updates.name,
      };
      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          ...updates,
          locations: [privateLocation1],
          revision: 2,
          url: 'https://www.google.com',
          spaces: ['default'],
        })
      );
    });

    it('prevents duplicate name of monitor', async () => {
      const name = `test name ${uuidv4()}`;
      const monitor = {
        name,
        type: 'http',
        private_locations: [privateLocation1.id],
        url: 'https://www.google.com',
      };
      // create one monitor with one name
      await addMonitorAPI(monitor);
      // create another monitor with a different name
      const { body: result, rawBody } = await addMonitorAPI({
        ...monitor,
        name: 'test name',
      });
      const newMonitorId = rawBody.id;

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          locations: [privateLocation1],
          name: 'test name',
          spaces: ['default'],
        })
      );

      const editResult = await editMonitorAPI(
        newMonitorId,
        {
          name,
        },
        400
      );

      expect(editResult).eql({
        statusCode: 400,
        error: 'Bad Request',
        message: `Monitor name must be unique, "${name}" already exists.`,
        attributes: {
          details: `Monitor name must be unique, "${name}" already exists.`,
        },
      });
    });

    it('can add a second private location to existing monitor', async () => {
      const monitor = {
        private_locations: [privateLocation1.id, privateLocation2.id],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 3,
          url: 'https://www.google.com',
          locations: [omit(privateLocation1, 'spaces'), omit(privateLocation2, 'spaces')],
          spaces: ['default'],
        })
      );
    });

    it('can remove private location from existing monitor', async () => {
      const monitor = {
        private_locations: [privateLocation2.id],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 4,
          url: 'https://www.google.com',
          locations: [omit(privateLocation2, 'spaces')],
          spaces: ['default'],
        })
      );
    });

    it('can not remove all locations', async () => {
      const monitor = {
        locations: [],
        private_locations: [],
      };

      const { message } = await editMonitorAPI(monitorId, monitor, 400);

      expect(message).eql(LOCATION_REQUIRED_ERROR);
    });
  });
}
