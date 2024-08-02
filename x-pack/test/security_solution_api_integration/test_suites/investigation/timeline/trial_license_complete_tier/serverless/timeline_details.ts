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

import { RoleCredentials } from '@kbn/test-suites-serverless/shared/services';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
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

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const secureBsearch = getService('secureBsearch');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;

  describe('Timeline Details', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default');
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('Make sure that we get Event Details data', async () => {
      const { data: detailsData } = await secureBsearch.send<TimelineEventsDetailsStrategyResponse>(
        {
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            factoryQueryType: TimelineEventsQueries.details,
            indexName: INDEX_NAME,
            inspect: false,
            eventId: ID,
          },
          strategy: 'timelineSearchStrategy',
        }
      );
      expect(sortBy(detailsData, 'field')).to.eql(sortBy(EXPECTED_DATA, 'field'));
    });

    it('Make sure that we get kpi data', async () => {
      const { destinationIpCount, hostCount, processCount, sourceIpCount, userCount } =
        await secureBsearch.send<TimelineKpiStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
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
