/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import type { SupertestReturnType } from '../../common/apm_api_supertest';

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

          it('includes anomaly scores from ML when the user has ML access', () => {
            // Archive includes APM ML jobs; the API merges max record_score per service as
            // anomalyScore. Only services present in ML anomaly results get a score.
            const itemsWithScore = response.body.items.filter(
              (item) => item.anomalyScore !== undefined && item.anomalyScore !== null
            );

            expect(itemsWithScore.length).to.be.greaterThan(0);

            for (const item of itemsWithScore) {
              expect(item.anomalyScore).to.be.a('number');
            }
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

        it('contains no anomaly scores when the user has no ML access', () => {
          const definedScores = response.body.items
            .map((item) => item.anomalyScore)
            .filter((score) => score !== undefined && score !== null);

          expect(definedScores.length).to.be(0);
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

        it('returns only services that match the kuery filter', () => {
          expect(response.status).to.be(200);

          expect(response.body.items.length).to.be(1);

          expect(response.body.items[0].serviceName).to.be('opbeans-java');
        });
      });
    }
  );
}
