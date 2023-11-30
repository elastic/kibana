/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit, omitBy } from 'lodash';

import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/helper';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './add_monitor';

export const editMonitorAPIHelper = async (
  supertestAPI: any,
  id: string,
  monitor: any,
  statusCode = 200
) => {
  const result = await supertestAPI
    .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${id}`)
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
      await kibanaServer.savedObjects.cleanStandardList();
    });
    let monitorId = 'test-id';

    it('adds test monitor', async () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.http, removeMonitorEmptyValues);

      const monitor = {
        type: 'http',
        locations: ['localhost'],
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
        "Invalid locations specified. Elastic managed Location(s) 'mars'  not found. Available locations are 'localhost'"
      );
    });

    it('return error if invalid private location specified', async () => {
      const { message } = await editMonitorAPI(
        {
          type: 'http',
          locations: ['mars'],
          privateLocations: ['moon'],
        },
        400
      );
      expect(message).eql('Invalid monitor key(s) for http type:  privateLocations');

      const result = await editMonitorAPI(
        {
          type: 'http',
          locations: ['mars'],
          private_locations: ['moon'],
        },
        400
      );
      expect(result.message).eql(
        "Invalid locations specified. Elastic managed Location(s) 'mars'  not found. Available locations are 'localhost' Private Location(s) 'moon'  not found. No private location available to use."
      );
    });

    const localLoc = {
      id: 'localhost',
      label: 'Local Synthetics Service',
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: true,
    };

    describe('HTTP Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.http, removeMonitorEmptyValues);
      it('return error empty http', async () => {
        const { message, attributes } = await editMonitorAPI(
          {
            type: 'http',
            locations: ['localhost'],
          },
          400
        );

        expect(message).eql('Monitor is not a valid monitor of type http');
        expect(attributes).eql({
          details:
            'Invalid field "url", must be a non-empty string. | Invalid value "undefined" supplied to "name"',
          payload: { type: 'http' },
        });
      });

      it('base http monitor', async () => {
        const monitor = {
          type: 'http',
          locations: ['localhost'],
          url: 'https://www.google.com',
        };
        const { body: result } = await editMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name: 'https://www.google.com',
          })
        );
      });
    });

    describe('TCP Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.tcp, removeMonitorEmptyValues);

      it('base tcp monitor', async () => {
        const monitor = {
          type: 'tcp',
          locations: ['localhost'],
          host: 'https://www.google.com/',
        };
        const { body: result } = await editMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name: 'https://www.google.com/',
          })
        );
      });
    });

    describe('ICMP Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.icmp, removeMonitorEmptyValues);

      it('base icmp monitor', async () => {
        const monitor = {
          type: 'icmp',
          locations: ['localhost'],
          host: 'https://8.8.8.8',
        };
        const { body: result } = await editMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name: 'https://8.8.8.8',
          })
        );
      });
    });

    describe('Browser Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.browser, removeMonitorEmptyValues);

      it('empty browser monitor', async () => {
        const monitor = {
          type: 'browser',
          locations: ['localhost'],
          name: 'simple journey',
        };
        const result = await editMonitorAPI(monitor, 400);

        expect(result).eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Monitor is not a valid monitor of type browser',
          attributes: {
            details: 'source.inline.script: Script is required for browser monitor.',
            payload: { type: 'browser', name: 'simple journey' },
          },
        });
      });

      it('base browser monitor', async () => {
        const monitor = {
          type: 'browser',
          locations: ['localhost'],
          name: 'simple journey',
          'source.inline.script': 'step("simple journey", async () => {});',
        };
        const { body: result } = await editMonitorAPI(monitor);

        expect(transformPublicKeys(result)).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
          })
        );
      });

      it('base browser monitor with inline_script', async () => {
        const monitor = {
          type: 'browser',
          locations: ['localhost'],
          name: 'simple journey inline_script',
          inline_script: 'step("simple journey", async () => {});',
        };
        const { body: result } = await editMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
          })
        );
      });
    });
  });
}
