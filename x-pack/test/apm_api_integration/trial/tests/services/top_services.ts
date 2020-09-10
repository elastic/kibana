/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as t from 'io-ts';
import { Severity } from '../../../../../plugins/apm/common/anomaly_detection';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getValueOrThrow } from '../../../../../plugins/apm/common/utils/get_value_or_throw';
import archives_metadata from '../../archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('APM Services Overview', () => {
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns a list of services with anomaly scores', async () => {
        const response = await supertest.get(
          `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);

        const metricType = t.strict({
          value: t.number,
          over_time: t.array(
            t.type({
              x: t.number,
              y: t.union([t.number, t.null]),
            })
          ),
        });

        const serviceType = t.strict({
          serviceName: t.string,
          agentName: t.string,
          transactionsPerMinute: metricType,
          avgResponseTime: metricType,
          // the RUM service will not have transaction error data
          transactionErrorRate: t.union([metricType, t.undefined]),
          environments: t.array(t.string),
          severity: t.union([
            t.literal(Severity.critical),
            t.literal(Severity.major),
            t.literal(Severity.minor),
            t.literal(Severity.warning),
            t.undefined,
          ]),
        });

        const responseType = t.type({
          items: t.array(serviceType),
          hasHistoricalData: t.literal(true),
          hasLegacyData: t.literal(false),
        });

        const data = getValueOrThrow(responseType, response.body);

        // there should be at least one service
        expect(data.items.length).to.be.greaterThan(0);

        // at least one item should have a severity set
        expect(data.items.some((item) => item.severity !== undefined)).to.be(true);
      });
    });
  });
}
