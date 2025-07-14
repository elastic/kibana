/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { NO_BACKTICKS_ERROR_MESSAGE } from '@kbn/synthetics-plugin/common/translations/translations';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';
import { LOCAL_PUBLIC_LOCATION } from './helpers/location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddNewMonitorsPublicAPI - Public locations', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertestAPI = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    let editorUser: RoleCredentials;

    async function addMonitorAPI(monitor: any, statusCode: number = 200) {
      return await addMonitorAPIHelper(supertestAPI, monitor, statusCode, editorUser, samlAuth);
    }

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('HTTP Monitor', () => {
      const defaultFields = DEFAULT_FIELDS.http;

      it('return error empty http', async () => {
        const { message, attributes } = await addMonitorAPI(
          {
            type: 'http',
            locations: [LOCAL_PUBLIC_LOCATION.id],
            private_locations: [],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
          url: 'https://www.google.com',
        };
        const { body: result } = await addMonitorAPI(monitor);

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

      it('can enable retries', async () => {
        const name = `test name ${uuidv4()}`;
        const monitor = {
          type: 'http',
          locations: [LOCAL_PUBLIC_LOCATION.id],
          url: 'https://www.google.com',
          name,
          retest_on_failure: true,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
          url: 'https://www.google.com',
          name,
          retest_on_failure: false,
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
          host: 'https://www.google.com/',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
          host: 'https://8.8.8.8',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
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
          locations: [LOCAL_PUBLIC_LOCATION.id],
          name: 'simple journey',
          'source.inline.script': 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
            spaces: ['default'],
          })
        );
      });

      it('base browser monitor with inline_script', async () => {
        const monitor = {
          type: 'browser',
          locations: [LOCAL_PUBLIC_LOCATION.id],
          name: 'simple journey inline_script',
          inline_script: 'step("simple journey", async () => {});',
        };
        const { body: result } = await addMonitorAPI(monitor);

        expect(result).eql(
          omitMonitorKeys({
            ...defaultFields,
            ...monitor,
            locations: [LOCAL_PUBLIC_LOCATION],
            spaces: ['default'],
          })
        );
      });

      it('base browser monitor with backticks in inline_script', async () => {
        const monitor = {
          type: 'browser',
          locations: [LOCAL_PUBLIC_LOCATION.id],
          name: 'simple journey inline_script',
          inline_script: 'step(`simple journey`, async () =\u003e {});',
        };
        const result = await addMonitorAPI(monitor, 400);

        expect(result).eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Monitor is not a valid monitor of type browser',
          attributes: {
            details: NO_BACKTICKS_ERROR_MESSAGE,
            payload: {
              type: 'browser',
              name: 'simple journey inline_script',
              inline_script: 'step(`simple journey`, async () => {});',
            },
          },
        });
      });
    });
  });
}
