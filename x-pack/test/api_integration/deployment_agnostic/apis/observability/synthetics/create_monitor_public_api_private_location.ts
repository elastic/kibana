/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import rawExpect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { LOCATION_REQUIRED_ERROR } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/monitor_validation';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddNewMonitorsPublicAPI - Private locations', function () {
    const supertestAPI = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;
    const privateLocationTestService = new PrivateLocationTestService(getService);

    async function addMonitorAPI(monitor: any, statusCode: number = 200) {
      return await addMonitorAPIHelper(supertestAPI, monitor, statusCode, editorUser, samlAuth);
    }

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      privateLocation = await privateLocationTestService.addTestPrivateLocation();
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
      rawExpect(message).toContain(
        "Invalid locations specified. Elastic managed Location(s) 'mars' not found."
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
      rawExpect(result.message).toContain("Private Location(s) 'moon' not found.");
    });

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
      const defaultFields = DEFAULT_FIELDS.http;
      it('return error empty http', async () => {
        const { message, attributes } = await addMonitorAPI(
          {
            type: 'http',
            locations: [],
            private_locations: [privateLocation.id],
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
          private_locations: [privateLocation.id],
          url: 'https://www.google.com',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            name: 'https://www.google.com',
            spaces: ['default'],
          })
        );
      });

      it('can enable retries', async () => {
        const name = `test name ${uuidv4()}`;
        const monitor = {
          type: 'http',
          private_locations: [privateLocation.id],
          url: 'https://www.google.com',
          name,
          retest_on_failure: true,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            name,
            retest_on_failure: true,
            spaces: ['default'],
          })
        );
      });

      it('can disable retries', async () => {
        const name = `test name ${uuidv4()}`;
        const monitor = {
          type: 'http',
          private_locations: [privateLocation.id],
          url: 'https://www.google.com',
          name,
          retest_on_failure: false,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            name,
            max_attempts: 1,
            retest_on_failure: undefined, // this key is not part of the SO and should not be defined
            spaces: ['default'],
          })
        );
      });
    });

    describe('TCP Monitor', () => {
      const defaultFields = DEFAULT_FIELDS.tcp;

      it('base tcp monitor', async () => {
        const monitor = {
          type: 'tcp',
          private_locations: [privateLocation.id],
          host: 'https://www.google.com/',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            name: 'https://www.google.com/',
            spaces: ['default'],
          })
        );
      });
    });

    describe('ICMP Monitor', () => {
      const defaultFields = DEFAULT_FIELDS.icmp;

      it('base icmp monitor', async () => {
        const monitor = {
          type: 'icmp',
          private_locations: [privateLocation.id],
          host: 'https://8.8.8.8',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            name: 'https://8.8.8.8',
            spaces: ['default'],
          })
        );
      });
    });

    describe('Browser Monitor', () => {
      const defaultFields = DEFAULT_FIELDS.browser;

      it('empty browser monitor', async () => {
        const monitor = {
          type: 'browser',
          private_locations: [privateLocation.id],
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
          private_locations: [privateLocation.id],
          name: 'simple journey',
          'source.inline.script': 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            spaces: ['default'],
          })
        );
      });

      it('base browser monitor with inline_script', async () => {
        const monitor = {
          type: 'browser',
          private_locations: [privateLocation.id],
          name: 'simple journey inline_script',
          inline_script: 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [privateLocation],
            spaces: ['default'],
          })
        );
      });
    });
  });
}
