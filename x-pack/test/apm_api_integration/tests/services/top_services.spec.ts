/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { SupertestReturnType } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';

  const archiveRange = archives_metadata[archiveName];

  // url parameters
  const archiveStart = archiveRange.start;
  const archiveEnd = archiveRange.end;

  registry.when(
    'APM Services Overview with a trial license when data is loaded',
    { config: 'trial', archives: [archiveName] },
    () => {
      describe('with the default APM read user', () => {
        describe('and fetching a list of services', () => {
          let response: {
            status: number;
            body: APIReturnType<'GET /internal/apm/services'>;
          };

          before(async () => {
            response = await apmApiClient.readUser({
              endpoint: `GET /internal/apm/services`,
              params: {
                query: {
                  start: archiveStart,
                  end: archiveEnd,
                  environment: ENVIRONMENT_ALL.value,
                  kuery: '',
                  probability: 1,
                  documentType: ApmDocumentType.TransactionMetric,
                  rollupInterval: RollupInterval.OneMinute,
                  useDurationSummary: true,
                },
              },
            });
          });

          it('the response is successful', () => {
            expect(response.status).to.eql(200);
          });

          it('there is at least one service', () => {
            expect(response.body.items.length).to.be.greaterThan(0);
          });

          it('some items have a health status set', () => {
            // Under the assumption that the loaded archive has
            // at least one APM ML job, and the time range is longer
            // than 15m, at least one items should have a health status
            // set. Note that we currently have a bug where healthy
            // services report as unknown (so without any health status):
            // https://github.com/elastic/kibana/issues/77083

            const healthStatuses = sortBy(response.body.items, 'serviceName').map(
              (item: any) => item.healthStatus
            );

            expect(healthStatuses.filter(Boolean).length).to.be.greaterThan(0);

            expectSnapshot(healthStatuses).toMatchInline(`
              Array [
                undefined,
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
                "healthy",
              ]
            `);
          });
        });
      });

      describe('with a user that does not have access to ML', () => {
        let response: SupertestReturnType<'GET /internal/apm/services'>;
        before(async () => {
          response = await apmApiClient.noMlAccessUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start: archiveStart,
                end: archiveEnd,
                environment: ENVIRONMENT_ALL.value,
                kuery: '',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('there is at least one service', () => {
          expect(response.body.items.length).to.be.greaterThan(0);
        });

        it('contains no health statuses', () => {
          const definedHealthStatuses = response.body.items
            .map((item) => item.healthStatus)
            .filter(Boolean);

          expect(definedHealthStatuses.length).to.be(0);
        });
      });

      describe('and fetching a list of services with a filter', () => {
        let response: SupertestReturnType<'GET /internal/apm/services'>;
        before(async () => {
          response = await apmApiClient.noMlAccessUser({
            endpoint: 'GET /internal/apm/services',
            params: {
              query: {
                start: archiveStart,
                end: archiveEnd,
                environment: ENVIRONMENT_ALL.value,
                kuery: 'service.name:opbeans-java',
                probability: 1,
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
                useDurationSummary: true,
              },
            },
          });
        });

        it('does not return health statuses for services that are not found in APM data', () => {
          expect(response.status).to.be(200);

          expect(response.body.items.length).to.be(1);

          expect(response.body.items[0].serviceName).to.be('opbeans-java');
        });
      });
    }
  );
}
