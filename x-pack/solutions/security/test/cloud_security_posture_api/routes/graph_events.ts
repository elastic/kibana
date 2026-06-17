/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { expect as expectExpect } from 'expect';
import type { Agent } from 'supertest';
import type { EventsRequest } from '@kbn/cloud-security-posture-common/types/graph_events/latest';
import type { FtrProviderContext } from '../ftr_provider_context';
import { result, loadAlertArchive } from '../utils';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const es = getService('es');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);

  const postGraphEvents = (
    agent: Agent,
    body: EventsRequest,
    auth?: { user: string; pass: string },
    spaceId?: string
  ) => {
    logger.debug(
      `POST ${spaceId ? `/s/${spaceId}` : ''}/internal/cloud_security_posture/graph/events`
    );
    let req = agent
      .post(`${spaceId ? `/s/${spaceId}` : ''}/internal/cloud_security_posture/graph/events`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx');

    if (auth) {
      req = req.auth(auth.user, auth.pass);
    }

    return req.send(body);
  };

  describe('POST /internal/cloud_security_posture/graph/events', () => {
    describe('Authorization', () => {
      it('should return 403 for user without read access', async () => {
        await postGraphEvents(
          supertestWithoutAuth,
          {
            query: {
              eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
              start: 'now-1d/d',
              end: 'now/d',
            },
            page: { index: 0, size: 10 },
          },
          {
            user: 'role_security_no_read_user',
            pass: cspSecurity.getPasswordForUser('role_security_no_read_user'),
          }
        ).expect(result(403, logger));
      });
    });

    describe('Validation', () => {
      it('should return 400 when missing `eventIds` field', async () => {
        await postGraphEvents(supertest, {
          // @ts-expect-error ignore error for testing
          query: {
            start: 'now-1d/d',
            end: 'now/d',
          },
          page: { index: 0, size: 10 },
        }).expect(result(400, logger));
      });

      it('should return 400 when eventIds is an empty array', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
          },
          page: { index: 0, size: 10 },
        }).expect(result(400, logger));
      });

      it('should return 400 when index patterns contain illegal characters', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
            start: 'now-1d/d',
            end: 'now/d',
            indexPatterns: ['.alerts-security-*| FROM *'],
          },
          page: { index: 0, size: 10 },
        }).expect(result(400, logger));
      });

      it('should return 400 when missing `page` field', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
            start: 'now-1d/d',
            end: 'now/d',
          },
        } as any).expect(result(400, logger));
      });

      it('should return 400 when page.index is negative', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
            start: 'now-1d/d',
            end: 'now/d',
          },
          page: { index: -1, size: 10 },
        }).expect(result(400, logger));
      });

      it('should return 400 when page.size is less than 1', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
            start: 'now-1d/d',
            end: 'now/d',
          },
          page: { index: 0, size: 0 },
        }).expect(result(400, logger));
      });

      it('should return 400 when page.size exceeds 100', async () => {
        await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1'],
            start: 'now-1d/d',
            end: 'now/d',
          },
          page: { index: 0, size: 101 },
        }).expect(result(400, logger));
      });
    });

    describe('Happy flows', () => {
      before(async () => {
        await loadAlertArchive({
          es,
          esArchiver,
          logger,
          archivePath:
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts_ecs',
        });
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
        );
      });

      after(async () => {
        // Using unload destroys index's alias of .alerts-security.alerts-default which causes a failure in other tests
        // Instead we delete all alerts from the index
        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
        });

        // Try to unload logs archive - might have been replaced by nested test suites
        try {
          await esArchiver.unload(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
          );
        } catch (e) {
          // Ignore if already unloaded or replaced by another archive
          logger.debug(`Could not unload logs_gcp_audit: ${e.message}`);
        }
      });

      it('should return events for known document IDs', async () => {
        const response = await postGraphEvents(supertest, {
          query: {
            eventIds: ['589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1', '1'],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
          },
          page: { index: 0, size: 10 },
        }).expect(result(200, logger));

        expect(response.body).to.have.property('events');
        expect(response.body).to.have.property('totalRecords');
        expect(response.body.totalRecords).to.equal(2);
        expect(response.body.events).to.have.length(2);
        expectExpect(response.body.events).toContainEqual(
          expectExpect.objectContaining({
            id: '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1',
            isAlert: true,
          })
        );
        expectExpect(response.body.events).toContainEqual(
          expectExpect.objectContaining({
            id: '1',
            isAlert: false,
          })
        );
        expect(response.body).not.to.have.property('messages');
      });

      it('should return an empty response when an event is not found', async () => {
        const response = await postGraphEvents(supertest, {
          query: {
            eventIds: ['missing-event-id'],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
          },
          page: { index: 0, size: 10 },
        }).expect(result(200, logger));

        expect(response.body).to.have.property('events');
        expect(response.body).to.have.property('totalRecords');
        expect(response.body.totalRecords).to.equal(0);
        expect(response.body.events).to.eql([]);
        expect(response.body).not.to.have.property('messages');
      });

      it('should paginate events correctly (page 1)', async () => {
        const response = await postGraphEvents(supertest, {
          query: {
            eventIds: [
              '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1',
              '1',
              '2',
            ],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
          },
          page: { index: 0, size: 2 },
        }).expect(result(200, logger));

        expect(response.body).to.have.property('events');
        expect(response.body).to.have.property('totalRecords');
        expect(response.body.totalRecords).to.equal(3);
        expect(response.body.events).to.have.length(2);
      });

      it('should paginate events correctly (page 2)', async () => {
        const response = await postGraphEvents(supertest, {
          query: {
            eventIds: [
              '589e086d7ceec7d4b353340578bd607e96fbac7eab9e2926f110990be15122f1',
              '1',
              '2',
            ],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
          },
          page: { index: 1, size: 2 },
        }).expect(result(200, logger));

        expect(response.body).to.have.property('events');
        expect(response.body).to.have.property('totalRecords');
        expect(response.body.totalRecords).to.equal(3);
        expect(response.body.events).to.have.length(1); // Last page has 1 remaining item
      });
    });
  });
}
