/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import {
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineKpiStrategyResponse,
} from '@kbn/security-solution-plugin/common/search_strategy';
import TestAgent from 'supertest/lib/agent';

import { BsearchService } from '@kbn/ftr-common-functional-services';
import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';
import { timelineDetailsFilebeatExpectedResults as EXPECTED_DATA } from '../mocks/timeline_details';

// typical values that have to change after an update from "scripts/es_archiver"
const INDEX_NAME = 'filebeat-7.0.0-iot-2019.06';
const ID = 'QRhG1WgBqd-n62SwZYDT';

const EXPECTED_KPI_COUNTS = {
  destinationIpCount: 154,
  hostCount: 1,
  processCount: 0,
  sourceIpCount: 121,
  userCount: 0,
};

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');

  describe('Timeline Details', () => {
    let supertest: TestAgent;
    let bsearch: BsearchService;
    before(async () => {
      supertest = await utils.createSuperTest();
      bsearch = await utils.createBsearch();
      await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
    });
    after(
      async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
    );

    it('Make sure that we get Event Details data', async () => {
      const { data: detailsData } = await bsearch.send<TimelineEventsDetailsStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: TimelineEventsQueries.details,
          indexName: INDEX_NAME,
          inspect: false,
          eventId: ID,
        },
        strategy: 'timelineSearchStrategy',
      });
      expect(sortBy(detailsData, 'field')).to.eql(sortBy(EXPECTED_DATA, 'field'));
    });

    it('Make sure that we get kpi data', async () => {
      const { destinationIpCount, hostCount, processCount, sourceIpCount, userCount } =
        await bsearch.send<TimelineKpiStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: TimelineEventsQueries.kpi,
            indexName: INDEX_NAME,
            inspect: false,
            eventId: ID,
          },
          strategy: 'timelineSearchStrategy',
        });
      expect({ destinationIpCount, hostCount, processCount, sourceIpCount, userCount }).to.eql(
        EXPECTED_KPI_COUNTS
      );
    });
  });
}
