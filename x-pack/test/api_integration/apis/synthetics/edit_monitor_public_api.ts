/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';

import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import moment from 'moment';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { LOCATION_REQUIRED_ERROR } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/monitor_validation';
import { FtrProviderContext } from '../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './add_monitor';
import { PrivateLocationTestService } from './services/private_location_test_service';

export const editMonitorAPIHelper = async (
  supertestAPI: any,
  monitorId: string,
  monitor: any,
  statusCode = 200
) => {
  const result = await supertestAPI
    .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`)
    .set('kbn-xsrf', 'true')
    .send(monitor);

  expect(result.status).eql(statusCode, JSON.stringify(result.body));

  if (statusCode === 200) {
    const { created_at: createdAt, updated_at: updatedAt, id, config_id: configId } = result.body;
    expect(id).not.empty();
    expect(configId).not.empty();
    expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
    return {
      rawBody: result.body,
      body: {
        ...omit(result.body, ['created_at', 'updated_at', 'id', 'config_id', 'form_monitor_type']),
      },
    };
  }
  return result.body;
};

export default function ({ getService }: FtrProviderContext) {
  describe('EditMonitorsPublicAPI', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const testPrivateLocations = new PrivateLocationTestService(getService);

    async function addMonitorAPI(monitor: any, statusCode: number = 200) {
      return await addMonitorAPIHelper(supertestAPI, monitor, statusCode);
    }

    async function editMonitorAPI(id: string, monitor: any, statusCode: number = 200) {
      return await editMonitorAPIHelper(supertestAPI, id, monitor, statusCode);
    }

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      // await kibanaServer.savedObjects.cleanStandardList();
    });
    let monitorId = 'test-id';

    const defaultFields = DEFAULT_FIELDS.http;
    it('adds test monitor', async () => {
      const monitor = {
        type: 'http',
        locations: ['dev'],
        url: 'https://www.google.com',
      };
      const { body: result, rawBody } = await addMonitorAPI(monitor);
      monitorId = rawBody.id;

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          locations: [localLoc],
          name: 'https://www.google.com',
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
      expect(message).eql(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found. Available locations are 'dev|dev2'"
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
      expect(result.message).eql(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found. Available locations are 'dev|dev2' Private Location(s) 'moon' not found. No private location available to use."
      );
    });

    const localLoc = {
      id: 'dev',
      label: 'Dev Service',
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: true,
    };

    it('throws an error if empty locations', async () => {
      const monitor = {
        locations: [],
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
      updates.name = 'updated name';
      const monitor = {
        name: 'updated name',
      };
      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          ...updates,
          locations: [localLoc],
          revision: 2,
          url: 'https://www.google.com',
        })
      );
    });

    it('prevents duplicate name of monitor', async () => {
      const monitor = {
        type: 'http',
        locations: ['dev'],
        url: 'https://www.google.com',
      };
      const { body: result, rawBody } = await addMonitorAPI(monitor);
      const newMonitorId = rawBody.id;

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...monitor,
          locations: [localLoc],
          name: 'https://www.google.com',
        })
      );

      const editResult = await editMonitorAPI(
        newMonitorId,
        {
          name: 'updated name',
        },
        400
      );

      expect(editResult).eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Monitor name must be unique, "updated name" already exists.',
        attributes: { details: 'Monitor name must be unique, "updated name" already exists.' },
      });
    });

    let pvtLoc: PrivateLocation;

    it('can add private location to existing monitor', async () => {
      await testPrivateLocations.installSyntheticsPackage();
      pvtLoc = await testPrivateLocations.addPrivateLocation();

      expect(pvtLoc).not.empty();

      const monitor = {
        private_locations: [pvtLoc.id],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 3,
          url: 'https://www.google.com',
          locations: [localLoc, omit(pvtLoc, 'spaces')],
        })
      );

      const { body: result2 } = await editMonitorAPI(monitorId, {
        locations: [pvtLoc],
      });

      expect(result2).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 4,
          url: 'https://www.google.com',
          locations: [omit(pvtLoc, 'spaces')],
        })
      );
    });

    it('can remove private location from existing monitor', async () => {
      let monitor: any = {
        locations: [localLoc.id],
        private_locations: [pvtLoc.id],
      };

      const { body: result } = await editMonitorAPI(monitorId, monitor);

      expect(result).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 5,
          url: 'https://www.google.com',
          locations: [localLoc, omit(pvtLoc, 'spaces')],
        })
      );

      monitor = {
        private_locations: [],
      };

      const { body: result1 } = await editMonitorAPI(monitorId, monitor);

      expect(result1).eql(
        omitMonitorKeys({
          ...defaultFields,
          ...updates,
          revision: 6,
          url: 'https://www.google.com',
          locations: [localLoc],
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
