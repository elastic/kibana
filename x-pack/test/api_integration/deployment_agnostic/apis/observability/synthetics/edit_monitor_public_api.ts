/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import moment from 'moment';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';
import { LOCAL_PUBLIC_LOCATION } from './helpers/location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('EditMonitorsPublicAPI - Public location', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertestAPI = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const testPrivateLocations = new PrivateLocationTestService(getService);
    let editorUser: RoleCredentials;

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
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    let monitorId = 'test-id';

    const defaultFields = DEFAULT_FIELDS.http;

    it('adds test monitor', async () => {
      const monitor = {
        type: 'http',
        locations: [LOCAL_PUBLIC_LOCATION.id],
        url: 'https://www.google.com',
      };
      const { body: result, rawBody } = await addMonitorAPI(monitor);
      monitorId = rawBody.id;

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          locations: [LOCAL_PUBLIC_LOCATION],
          name: 'https://www.google.com',
          spaces: ['default'],
        })
      );
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
          locations: [LOCAL_PUBLIC_LOCATION],
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
        locations: [LOCAL_PUBLIC_LOCATION.id],
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
          locations: [LOCAL_PUBLIC_LOCATION],
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

    it('can add a second public location to existing monitor', async () => {
      const monitor = {
        locations: [LOCAL_PUBLIC_LOCATION.id, 'dev2'],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 3,
          url: 'https://www.google.com',
          locations: [
            LOCAL_PUBLIC_LOCATION,
            { ...LOCAL_PUBLIC_LOCATION, id: 'dev2', label: 'Dev Service 2' },
          ],
          spaces: ['default'],
        })
      );
    });

    it('can remove public location from existing monitor', async () => {
      const monitor = {
        locations: ['dev2'],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 4,
          url: 'https://www.google.com',
          locations: [{ ...LOCAL_PUBLIC_LOCATION, id: 'dev2', label: 'Dev Service 2' }],
          spaces: ['default'],
        })
      );
    });
  });
}
