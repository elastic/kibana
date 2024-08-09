/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { omitBy } from 'lodash';

import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/helper';
import { LOCATION_REQUIRED_ERROR } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/monitor_validation';
import { FtrProviderContext } from '../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './add_monitor';

export default function ({ getService }: FtrProviderContext) {
  describe('AddNewMonitorsPublicAPI', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    async function addMonitorAPI(monitor: any, statusCode: number = 200) {
      return await addMonitorAPIHelper(supertestAPI, monitor, statusCode);
    }

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should return error for empty monitor', async function () {
      const { message } = await addMonitorAPI({}, 400);
      expect(message).eql('Invalid value "undefined" supplied to "type"');
    });

    it('return error if no location specified', async () => {
      const { message } = await addMonitorAPI({ type: 'http' }, 400);
      expect(message).eql(LOCATION_REQUIRED_ERROR);
    });

    it('return error if invalid location specified', async () => {
      const { message } = await addMonitorAPI({ type: 'http', locations: ['mars'] }, 400);
      expect(message).eql(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found. Available locations are 'dev'"
      );
    });

    it('return error if invalid private location specified', async () => {
      const { message } = await addMonitorAPI(
        {
          type: 'http',
          locations: ['mars'],
          privateLocations: ['moon'],
        },
        400
      );
      expect(message).eql('Invalid monitor key(s) for http type:  privateLocations');

      const result = await addMonitorAPI(
        {
          type: 'http',
          locations: ['mars'],
          private_locations: ['moon'],
        },
        400
      );
      expect(result.message).eql(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found. Available locations are 'dev' Private Location(s) 'moon' not found. No private location available to use."
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

    it('return error for origin project', async () => {
      const { message } = await addMonitorAPI(
        {
          type: 'http',
          locations: ['dev'],
          url: 'https://www.google.com',
          origin: 'project',
        },
        400
      );
      expect(message).eql('Unsupported origin type project, only ui type is supported via API.');
    });

    describe('HTTP Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.http, removeMonitorEmptyValues);
      it('return error empty http', async () => {
        const { message, attributes } = await addMonitorAPI(
          {
            type: 'http',
            locations: ['dev'],
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
          locations: ['dev'],
          url: 'https://www.google.com',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name: 'https://www.google.com',
          })
        );
      });

      it('can enable retries', async () => {
        const name = `test name ${uuidv4()}`;
        const monitor = {
          type: 'http',
          locations: ['dev'],
          url: 'https://www.google.com',
          name,
          retest_on_failure: true,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name,
            max_attempts: 2,
            retest_on_failure: undefined, // this key is not part of the SO and should not be defined
          })
        );
      });

      it('can disable retries', async () => {
        const name = `test name ${uuidv4()}`;
        const monitor = {
          type: 'http',
          locations: ['dev'],
          url: 'https://www.google.com',
          name,
          retest_on_failure: false,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [localLoc],
            name,
            max_attempts: 1,
            retest_on_failure: undefined, // this key is not part of the SO and should not be defined
          })
        );
      });
    });

    describe('TCP Monitor', () => {
      const defaultFields = omitBy(DEFAULT_FIELDS.tcp, removeMonitorEmptyValues);

      it('base tcp monitor', async () => {
        const monitor = {
          type: 'tcp',
          locations: ['dev'],
          host: 'https://www.google.com/',
        };
        const { body: result } = await addMonitorAPI(monitor);

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
          locations: ['dev'],
          host: 'https://8.8.8.8',
        };
        const { body: result } = await addMonitorAPI(monitor);

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
          locations: ['dev'],
          name: 'simple journey',
        };
        const result = await addMonitorAPI(monitor, 400);

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
          locations: ['dev'],
          name: 'simple journey',
          'source.inline.script': 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

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
          locations: ['dev'],
          name: 'simple journey inline_script',
          inline_script: 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

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
