/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import { ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

import { TimelineEdges, TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import {
  Direction,
  TimelineEventsQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { User } from '../../../../rule_registry/common/lib/authentication/types';
import { getSpaceUrlPrefix } from '../../../../rule_registry/common/lib/authentication/spaces';

import {
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
  superUser,
} from '../../../../rule_registry/common/lib/authentication/users';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

class FileWrapper {
  constructor(private readonly path: string) {}
  async reset() {
    // "touch" each file to ensure it exists and is empty before each test
    await Fs.promises.writeFile(this.path, '');
  }
  async read() {
    const content = await Fs.promises.readFile(this.path, { encoding: 'utf8' });
    return content.trim().split('\n');
  }
  async readJSON() {
    const content = await this.read();
    return content.map((l) => JSON.parse(l));
  }
  // writing in a file is an async operation. we use this method to make sure logs have been written.
  async isNotEmpty() {
    const content = await this.read();
    const line = content[0];
    return line.length > 0;
  }
}

interface TestCase {
  /** The space where the alert exists */
  space?: string;
  /** The ID of the solution for which to get alerts */
  featureIds: string[];
  /** The total alerts expected to be returned */
  expectedNumberAlerts: number;
  /** body to be posted */
  body: JsonObject;
  /** Authorized users */
  authorizedUsers: User[];
  /** Unauthorized users */
  unauthorizedUsers: User[];
}

const TO = '3000-01-01T00:00:00.000Z';
const FROM = '2000-01-01T00:00:00.000Z';
const TEST_URL = '/internal/search/timelineSearchStrategy/';
const SPACE_1 = 'space1';
const SPACE_2 = 'space2';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const getPostBody = (): JsonObject => ({
    defaultIndex: ['.alerts-*'],
    entityType: 'alerts',
    docValueFields: [
      {
        field: '@timestamp',
      },
    ],
    factoryQueryType: TimelineEventsQueries.all,
    fieldRequested: ['@timestamp'],
    fields: [],
    filterQuery: {
      bool: {
        filter: [
          {
            match_all: {},
          },
        ],
      },
    },
    pagination: {
      activePage: 0,
      querySize: 25,
    },
    language: 'kuery',
    sort: [
      {
        field: '@timestamp',
        direction: Direction.desc,
        type: 'number',
      },
    ],
    timerange: {
      from: FROM,
      to: TO,
      interval: '12h',
    },
  });

  describe('Timeline - Events', () => {
    const logFilePath = Path.resolve(__dirname, '../../../common/audit.log');
    const logFile = new FileWrapper(logFilePath);
    const retry = getService('retry');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    function addTests({
      space,
      authorizedUsers,
      unauthorizedUsers,
      body,
      featureIds,
      expectedNumberAlerts,
    }: TestCase) {
      authorizedUsers.forEach(({ username, password }) => {
        it(`${username} should be able to view alerts from "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
          // This will be flake until it uses the bsearch service, but these tests aren't operational. Once you do make this operational
          // use const bsearch = getService('bsearch');
          const resp = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .set('Content-Type', 'application/json')
            .send({ ...body })
            .expect(200);

          const timeline = resp.body;

          expect(
            timeline.edges.every((hit: TimelineEdges) => {
              const data: TimelineNonEcsData[] = hit.node.data;
              return data.some(({ field, value }) => {
                return (
                  field === ALERT_RULE_CONSUMER && featureIds.includes((value && value[0]) ?? '')
                );
              });
            })
          ).to.equal(true);
          expect(timeline.totalCount).to.be(expectedNumberAlerts);
        });
      });

      unauthorizedUsers.forEach(({ username, password }) => {
        it(`${username} should NOT be able to access "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
          // This will be flake until it uses the bsearch service, but these tests aren't operational. Once you do make this operational
          // use const bsearch = getService('bsearch');
          await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .set('Content-Type', 'application/json')
            .send({ ...body })
            // TODO - This should be updated to be a 403 once this ticket is resolved
            // https://github.com/elastic/kibana/issues/106005
            .expect(500);
        });
      });
    }

    // TODO - tests need to be updated with new table logic
    describe.skip('alerts authentication', () => {
      addTests({
        space: SPACE_1,
        featureIds: ['apm'],
        expectedNumberAlerts: 2,
        body: {
          ...getPostBody(),
          defaultIndex: ['.alerts*'],
          entityType: 'alerts',
          alertConsumers: ['apm'],
        },
        authorizedUsers: [obsMinReadAlertsRead, obsMinReadAlertsReadSpacesAll],
        unauthorizedUsers: [obsMinRead, obsMinReadSpacesAll],
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/117462
    describe.skip('logging', () => {
      beforeEach(async () => {
        await logFile.reset();
      });

      afterEach(async () => {
        await logFile.reset();
      });

      it('logs success events when reading alerts', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE_1)}${TEST_URL}`)
          .auth(superUser.username, superUser.password)
          .set('kbn-xsrf', 'true')
          .set('Content-Type', 'application/json')
          .send({
            ...getPostBody(),
            defaultIndex: ['.alerts-*'],
            entityType: 'alerts',
            alertConsumers: ['apm'],
          })
          .expect(200);
        await retry.waitFor('logs event in the dest file', async () => await logFile.isNotEmpty());

        const content = await logFile.readJSON();

        const httpEvent = content.find((c) => c.event.action === 'http_request');
        expect(httpEvent).to.be.ok();
        expect(httpEvent.trace.id).to.be.ok();
        expect(httpEvent.user.name).to.be(superUser.username);
        expect(httpEvent.kibana.space_id).to.be('space1');
        expect(httpEvent.http.request.method).to.be('post');
        expect(httpEvent.url.path).to.be('/s/space1/internal/search/timelineSearchStrategy/');

        const findEvents = content.filter((c) => c.event.action === 'alert_find');
        expect(findEvents[0].trace.id).to.be.ok();
        expect(findEvents[0].event.outcome).to.be('success');
        expect(findEvents[0].user.name).to.be(superUser.username);
        expect(findEvents[0].kibana.space_id).to.be('space1');
      });

      it('logs failure events when unauthorized to read alerts', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE_2)}${TEST_URL}`)
          .auth(obsMinRead.username, obsMinRead.password)
          .set('kbn-xsrf', 'true')
          .set('Content-Type', 'application/json')
          .send({
            ...getPostBody(),
            defaultIndex: ['.alerts-*'],
            entityType: 'alerts',
            alertConsumers: ['apm'],
          })
          .expect(500);
        await retry.waitFor('logs event in the dest file', async () => await logFile.isNotEmpty());

        const content = await logFile.readJSON();

        const httpEvent = content.find((c) => c.event.action === 'http_request');
        expect(httpEvent).to.be.ok();
        expect(httpEvent.trace.id).to.be.ok();
        expect(httpEvent.user.name).to.be(obsMinRead.username);
        expect(httpEvent.kibana.space_id).to.be(SPACE_2);
        expect(httpEvent.http.request.method).to.be('post');
        expect(httpEvent.url.path).to.be('/s/space2/internal/search/timelineSearchStrategy/');

        const findEvents = content.filter((c) => c.event.action === 'alert_find');
        expect(findEvents.length).to.equal(1);
        expect(findEvents[0].trace.id).to.be.ok();
        expect(findEvents[0].event.outcome).to.be('failure');
        expect(findEvents[0].user.name).to.be(obsMinRead.username);
        expect(findEvents[0].kibana.space_id).to.be(SPACE_2);
      });
    });
  });
};
