/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, ApmSynthtraceEsClient, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../plugins/apm/common/index_pattern_constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SupertestReturnType } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtrace = getService('synthtraceEsClient');

  const dataViewPattern = 'traces-apm*,apm-*,logs-apm*,apm-*,metrics-apm*,apm-*';

  function createDataViewViaApmApi() {
    return apmApiClient.readUser({ endpoint: 'POST /internal/apm/data_view/static' });
  }

  function deleteDataView() {
    // return supertest.delete('/api/saved_objects/<type>/<id>').set('kbn-xsrf', 'foo').expect(200)
    return supertest
      .delete(`/api/saved_objects/index-pattern/${APM_STATIC_INDEX_PATTERN_ID}`)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  function getDataView() {
    return supertest.get(`/api/saved_objects/index-pattern/${APM_STATIC_INDEX_PATTERN_ID}`);
  }

  function getDataViewSuggestions(field: string) {
    return supertest
      .post(`/api/kibana/suggestions/values/${dataViewPattern}`)
      .set('kbn-xsrf', 'foo')
      .send({ query: '', field, method: 'terms_agg' });
  }

  registry.when('no mappings exist', { config: 'basic', archives: [] }, () => {
    let response: SupertestReturnType<'POST /internal/apm/data_view/static'>;
    describe('when no data is generated', () => {
      before(async () => {
        response = await createDataViewViaApmApi();
      });

      it('does not create data view', async () => {
        expect(response.status).to.be(200);
        expect(response.body.created).to.be(false);
      });

      it('cannot fetch data view', async () => {
        await getDataView().expect(404);
      });
    });
  });

  registry.when(
    'mappings exists',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is generated', () => {
        let response: SupertestReturnType<'POST /internal/apm/data_view/static'>;

        before(async () => {
          await generateApmData(synthtrace);
          response = await createDataViewViaApmApi();
        });

        after(async () => {
          await deleteDataView();
          await synthtrace.clean();
        });

        it('successfully creates the apm data view', async () => {
          expect(response.status).to.be(200);
          expect(response.body.created).to.be(true);
        });

        describe('when fetching the data view', async () => {
          let resBody: any;

          before(async () => {
            const res = await getDataView().expect(200);
            resBody = res.body;
          });

          it('has correct id', () => {
            expect(resBody.id).to.be('apm_static_index_pattern_id');
          });

          it('has correct title', () => {
            expect(resBody.attributes.title).to.be(dataViewPattern);
          });

          it('has correct attributes', () => {
            expect(resBody.attributes.fieldFormatMap).to.be(
              JSON.stringify({
                'trace.id': {
                  id: 'url',
                  params: {
                    urlTemplate: 'apm/link-to/trace/{{value}}',
                    labelTemplate: '{{value}}',
                  },
                },
                'transaction.id': {
                  id: 'url',
                  params: {
                    urlTemplate: 'apm/link-to/transaction/{{value}}',
                    labelTemplate: '{{value}}',
                  },
                },
              })
            );
          });

          // this test ensures that the default APM Data View doesn't interfere with suggestions returned in the kuery bar (this has been a problem in the past)
          it('can get suggestions for `trace.id`', async () => {
            const suggestions = await getDataViewSuggestions('trace.id');
            expect(suggestions.body.length).to.be(10);
          });
        });
      });
    }
  );
}

function generateApmData(synthtrace: ApmSynthtraceEsClient) {
  const range = timerange(
    new Date('2021-10-01T00:00:00.000Z').getTime(),
    new Date('2021-10-01T00:01:00.000Z').getTime()
  );

  const instance = apm.service('multiple-env-service', 'production', 'go').instance('my-instance');

  return synthtrace.index([
    range
      .interval('1s')
      .rate(1)
      .spans((timestamp) =>
        instance.transaction('GET /api').timestamp(timestamp).duration(30).success().serialize()
      ),
  ]);
}
