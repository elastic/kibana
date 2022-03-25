/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSecurityTelemetryStats,
  createExceptionListItem,
  createExceptionList,
} from '../../../../utils';
import { deleteAllExceptions } from '../../../../../lists_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');

  describe('Security lists task telemetry', async () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/telemetry');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
      // Calling stats endpoint once like this guarantees that the trusted applications and exceptions lists are created for us.
      await getSecurityTelemetryStats(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllExceptions(supertest, log);
    });

    describe('Trusted Applications lists', () => {
      it('should give telemetry/stats for 1 exception list', async () => {
        // add 1 item to the existing trusted application exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'process.hash.md5',
              operator: 'included',
              type: 'match',
              value: 'ae27a4b4821b13cad2a17a75d219853e',
            },
          ],
          list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
          name: ENDPOINT_TRUSTED_APPS_LIST_ID,
          os_types: ['linux'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);

          const trustedApplication = stats.security_lists
            .flat()
            .map((obj: { trusted_application: any }) => obj.trusted_application);
          expect(trustedApplication).to.eql([
            {
              created_at: trustedApplication[0].created_at,
              entries: [
                {
                  field: 'process.hash.md5',
                  operator: 'included',
                  type: 'match',
                  value: 'ae27a4b4821b13cad2a17a75d219853e',
                },
              ],
              id: trustedApplication[0].id,
              name: ENDPOINT_TRUSTED_APPS_LIST_ID,
              os_types: ['linux'],
              scope: {
                type: 'policy',
                policies: [],
              },
            },
          ]);
        });
      });

      it('should give telemetry/stats for 2 exception list', async () => {
        // add 1 item to the existing trusted applications exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'process.hash.md5',
              operator: 'included',
              type: 'match',
              value: 'ae27a4b4821b13cad2a17a75d219853e',
            },
          ],
          list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
          name: 'something 1',
          os_types: ['linux'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        // add 2nd item to the existing trusted application exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'process.hash.md5',
              operator: 'included',
              type: 'match',
              value: '437b930db84b8079c2dd804a71936b5f',
            },
          ],
          list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
          name: 'something 2',
          os_types: ['macos'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);

          const trustedApplication = stats.security_lists
            .flat()
            .map((obj: { trusted_application: any }) => obj.trusted_application)
            .sort((obj1: { entries: { name: number } }, obj2: { entries: { name: number } }) => {
              return obj1.entries.name - obj2.entries.name;
            });

          expect(trustedApplication).to.eql([
            {
              created_at: trustedApplication[0].created_at,
              entries: [
                {
                  field: 'process.hash.md5',
                  operator: 'included',
                  type: 'match',
                  value: 'ae27a4b4821b13cad2a17a75d219853e',
                },
              ],
              id: trustedApplication[0].id,
              name: 'something 1',
              os_types: ['linux'],
              scope: {
                type: 'policy',
                policies: [],
              },
            },
            {
              created_at: trustedApplication[1].created_at,
              entries: [
                {
                  field: 'process.hash.md5',
                  operator: 'included',
                  type: 'match',
                  value: '437b930db84b8079c2dd804a71936b5f',
                },
              ],
              id: trustedApplication[1].id,
              name: 'something 2',
              os_types: ['macos'],
              scope: {
                type: 'policy',
                policies: [],
              },
            },
          ]);
        });
      });
    });

    describe('Endpoint Exception lists', () => {
      it('should give telemetry/stats for 1 exception list', async () => {
        // add 1 item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: ENDPOINT_LIST_ID,
          name: ENDPOINT_LIST_ID,
          os_types: [],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          const securityLists = stats.security_lists
            .flat()
            .map((obj: { endpoint_exception: any }) => obj.endpoint_exception);
          expect(securityLists).to.eql([
            {
              created_at: securityLists[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: securityLists[0].id,
              name: ENDPOINT_LIST_ID,
              os_types: [],
            },
          ]);
        });
      });

      it('should give telemetry/stats for 2 exception lists', async () => {
        // add 1st item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something 1',
            },
          ],
          list_id: ENDPOINT_LIST_ID,
          name: ENDPOINT_LIST_ID,
          os_types: [],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        // add 2nd item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'keyword',
              operator: 'included',
              type: 'match',
              value: 'something 2',
            },
          ],
          list_id: 'endpoint_list',
          name: ENDPOINT_LIST_ID,
          os_types: [],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          const securityLists = stats.security_lists
            .flat()
            .map((obj: { endpoint_exception: any }) => obj.endpoint_exception)
            .sort((obj1: { entries: { name: number } }, obj2: { entries: { name: number } }) => {
              return obj1.entries.name - obj2.entries.name;
            });

          expect(securityLists).to.eql([
            {
              created_at: securityLists[0].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something 1',
                },
              ],
              id: securityLists[0].id,
              name: ENDPOINT_LIST_ID,
              os_types: [],
            },
            {
              created_at: securityLists[1].created_at,
              entries: [
                {
                  field: 'keyword',
                  operator: 'included',
                  type: 'match',
                  value: 'something 2',
                },
              ],
              id: securityLists[1].id,
              name: ENDPOINT_LIST_ID,
              os_types: [],
            },
          ]);
        });
      });
    });

    describe('Endpoint Event Filters Exception lists', () => {
      beforeEach(async () => {
        // We have to manually create this event filter exception list. It does not look
        // like there is an auto-create for it within Kibana. It must exist somewhere else.
        await createExceptionList(supertest, log, {
          description: 'endpoint description',
          list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
          name: ENDPOINT_EVENT_FILTERS_LIST_ID,
          type: 'detection',
          namespace_type: 'agnostic',
        });
      });

      it('should give telemetry/stats for 1 exception list', async () => {
        // add 1 item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'something',
            },
          ],
          list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
          name: ENDPOINT_EVENT_FILTERS_LIST_ID,
          os_types: ['linux'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          const endPointEventFilter = stats.security_lists
            .flat()
            .map((obj: { endpoint_event_filter: any }) => obj.endpoint_event_filter);
          expect(endPointEventFilter).to.eql([
            {
              created_at: endPointEventFilter[0].created_at,
              entries: [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'match',
                  value: 'something',
                },
              ],
              id: endPointEventFilter[0].id,
              name: ENDPOINT_EVENT_FILTERS_LIST_ID,
              os_types: ['linux'],
            },
          ]);
        });
      });

      it('should give telemetry/stats for 2 exception lists', async () => {
        // add 1st item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'something 1',
            },
          ],
          list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
          name: ENDPOINT_EVENT_FILTERS_LIST_ID,
          os_types: ['linux'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        // add 2nd item to the existing endpoint exception list
        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'something 2',
            },
          ],
          list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
          name: ENDPOINT_EVENT_FILTERS_LIST_ID,
          os_types: ['macos'],
          type: 'simple',
          namespace_type: 'agnostic',
        });

        await retry.try(async () => {
          const stats = await getSecurityTelemetryStats(supertest, log);
          const endPointEventFilter = stats.security_lists
            .flat()
            .map((obj: { endpoint_event_filter: any }) => obj.endpoint_event_filter)
            .sort((obj1: { entries: { name: number } }, obj2: { entries: { name: number } }) => {
              return obj1.entries.name - obj2.entries.name;
            });

          expect(endPointEventFilter).to.eql([
            {
              created_at: endPointEventFilter[0].created_at,
              entries: [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'match',
                  value: 'something 1',
                },
              ],
              id: endPointEventFilter[0].id,
              name: ENDPOINT_EVENT_FILTERS_LIST_ID,
              os_types: ['linux'],
            },
            {
              created_at: endPointEventFilter[1].created_at,
              entries: [
                {
                  field: 'host.name',
                  operator: 'included',
                  type: 'match',
                  value: 'something 2',
                },
              ],
              id: endPointEventFilter[1].id,
              name: ENDPOINT_EVENT_FILTERS_LIST_ID,
              os_types: ['macos'],
            },
          ]);
        });
      });
    });
  });
};
