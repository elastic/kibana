/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Job, Datafeed } from '@kbn/ml-plugin/public/shared';
import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const catJobId = `test_top_cat`;
  const catDatafeedId = `datafeed-${catJobId}`;

  const job: Job = {
    job_id: catJobId,
    description: '',
    groups: [],
    analysis_config: {
      bucket_span: '15m',
      detectors: [
        {
          function: 'count',
          by_field_name: 'mlcategory',
        },
      ],
      influencers: ['mlcategory'],
      per_partition_categorization: {
        enabled: false,
        stop_on_warn: false,
      },
      categorization_field_name: 'field3',
    },
    data_description: {
      time_field: '@timestamp',
    },
    custom_settings: {
      created_by: 'categorization-wizard',
    },
    analysis_limits: {
      model_memory_limit: '11MB',
    },
    model_plot_config: {
      enabled: false,
      annotations_enabled: false,
    },
  } as unknown as Job;

  const datafeed: Datafeed = {
    datafeed_id: `datafeed-${catJobId}`,
    job_id: catJobId,
    indices: ['ft_categorization_small'],
    query: {
      bool: {
        must: [
          {
            match_all: {},
          },
        ],
      },
    },
    runtime_mappings: {},
  } as unknown as Datafeed;

  const expectedTopCategories = {
    total: 21,
    categories: [
      {
        category: {
          job_id: catJobId,
          category_id: 3,
          terms:
            'failed to execute bulk item index index testing-twitter-pycon-realtime doc source n/a actual length max length',
          regex:
            '.*?failed.+?to.+?execute.+?bulk.+?item.+?index.+?index.+?testing-twitter-pycon-realtime.+?doc.+?source.+?n/a.+?actual.+?length.+?max.+?length.*',
          max_matching_length: 1101,
          examples: [
            '[0] failed to execute bulk item (index) index {[testing-twitter-pycon-realtime][_doc][1115075670953136128], source[n/a, actual length: [4.9kb], max length: 2kb]}\njava.lang.IllegalArgumentException: Limit of total fields [1000] in index [testing-twitter-pycon-realtime] has been exceeded\n\tat org.elasticsearch.index.mapper.MapperService.checkTotalFieldsLimit(MapperService.java:602) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.internalMerge(MapperService.java:506) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.internalMerge(MapperService.java:398) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.merge(MapperService.java:331) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.cluster.metadata.MetaDataMappingService$PutMappingExecutor.applyRequest(MetaDataMappingService.java:315) ~[elasticsearch-7.0.0-SNAPSHOT....',
          ],
          num_matches: 1,
          result_type: 'category_definition',
          mlcategory: '3',
        },
      },
      {
        category: {
          job_id: catJobId,
          category_id: 4,
          terms: 'creating index cause api templates shards mappings doc',
          regex: '.*?creating.+?index.+?cause.+?api.+?templates.+?shards.+?mappings.+?doc.*',
          max_matching_length: 81,
          examples: ['creating index, cause [api], templates [], shards [1]/[1], mappings [_doc]'],
          num_matches: 1,
          result_type: 'category_definition',
          mlcategory: '4',
        },
      },
      {
        category: {
          job_id: catJobId,
          category_id: 9,
          terms: 'All shards failed for phase query',
          regex: '.*?All.+?shards.+?failed.+?for.+?phase.+?query.*',
          max_matching_length: 1101,
          examples: [
            'All shards failed for phase: [query]\norg.elasticsearch.ElasticsearchException$1: Result window is too large, from + size must be less than or equal to: [10000] but was [10644]. See the scroll api for a more efficient way to request large data sets. This limit can be set by changing the [index.max_result_window] index level setting.\n\tat org.elasticsearch.ElasticsearchException.guessRootCauses(ElasticsearchException.java:639) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.action.search.AbstractSearchAsyncAction.executeNextPhase(AbstractSearchAsyncAction.java:137) [elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.action.search.AbstractSearchAsyncAction.onPhaseDone(AbstractSearchAsyncAction.java:259) [elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.action.search.InitialSearchPhase.onShardFailure(InitialSearchPhase.java:105) [elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.action.search.InitialS...',
          ],
          num_matches: 1,
          result_type: 'category_definition',
          mlcategory: '9',
        },
      },
      {
        category: {
          job_id: catJobId,
          category_id: 8,
          terms: 'snapshot pycon-twitter-daily-backup started',
          regex: '.*?snapshot.+?pycon-twitter-daily-backup.+?started.*',
          max_matching_length: 103,
          examples: [
            'snapshot [pycon-twitter-daily-backup:twitter_backup_2019_04_18/ozb2eoofSN6U0f1rmlNu5w] started',
            'snapshot [pycon-twitter-daily-backup:twitter_backup_2019_04_23/4KHfIKG8RTmZMqqjRT4Uzg] started',
            'snapshot [pycon-twitter-daily-backup:twitter_backup_2019_04_27/DzBfwnv8QgSBAgS_RcmGWQ] started',
            'snapshot [pycon-twitter-daily-backup:twitter_backup_2019_06_09/rcW_Y38MQIOBJXmDZcQR3w] started',
          ],
          num_matches: 4,
          result_type: 'category_definition',
          mlcategory: '8',
        },
      },
      {
        category: {
          job_id: catJobId,
          category_id: 5,
          terms: 'INFO o.e.m.j.JvmGcMonitorService node-1 gc overhead spent collecting in the last',
          regex:
            '.*?INFO.+?o\\.e\\.m\\.j\\.JvmGcMonitorService.+?node-1.+?gc.+?overhead.+?spent.+?collecting.+?in.+?the.+?last.*',
          max_matching_length: 149,
          examples: [
            '[2019-04-09T11:35:03,788][INFO ][o.e.m.j.JvmGcMonitorService] [node-1] [gc][1203746] overhead, spent [264ms] collecting in the last [1s]',
            '[2019-04-11T07:30:39,130][INFO ][o.e.m.j.JvmGcMonitorService] [node-1] [gc][1361831] overhead, spent [331ms] collecting in the last [1s]',
            '[2019-04-12T02:12:49,374][INFO ][o.e.m.j.JvmGcMonitorService] [node-1] [gc][1429140] overhead, spent [269ms] collecting in the last [1s]',
            '[2019-07-02T03:50:38,870][INFO ][o.e.m.j.JvmGcMonitorService] [node-1] [gc][8431305] overhead, spent [456ms] collecting in the last [1s]',
          ],
          num_matches: 4,
          result_type: 'category_definition',
          mlcategory: '5',
        },
      },
    ],
  };
  const expectedCategory3 = {
    job_id: 'test_top_cat',
    category_id: 3,
    terms:
      'failed to execute bulk item index index testing-twitter-pycon-realtime doc source n/a actual length max length',
    regex:
      '.*?failed.+?to.+?execute.+?bulk.+?item.+?index.+?index.+?testing-twitter-pycon-realtime.+?doc.+?source.+?n/a.+?actual.+?length.+?max.+?length.*',
    max_matching_length: 1101,
    examples: [
      '[0] failed to execute bulk item (index) index {[testing-twitter-pycon-realtime][_doc][1115075670953136128], source[n/a, actual length: [4.9kb], max length: 2kb]}\njava.lang.IllegalArgumentException: Limit of total fields [1000] in index [testing-twitter-pycon-realtime] has been exceeded\n\tat org.elasticsearch.index.mapper.MapperService.checkTotalFieldsLimit(MapperService.java:602) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.internalMerge(MapperService.java:506) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.internalMerge(MapperService.java:398) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.index.mapper.MapperService.merge(MapperService.java:331) ~[elasticsearch-7.0.0-SNAPSHOT.jar:7.0.0-SNAPSHOT]\n\tat org.elasticsearch.cluster.metadata.MetaDataMappingService$PutMappingExecutor.applyRequest(MetaDataMappingService.java:315) ~[elasticsearch-7.0.0-SNAPSHOT....',
    ],
    grok_pattern:
      '.*?%{NUMBER:field}.+?failed.+?to.+?execute.+?bulk.+?item.+?index.+?index.+?testing-twitter-pycon-realtime.+?doc.+?%{NUMBER:field2}.+?source.+?n/a.+?actual.+?length.+?max.+?length.+?%{NUMBER:field3}.*',
    num_matches: 1,
    result_type: 'category_definition',
    mlcategory: '3',
  };

  async function runTopCategoriesRequest(jobId: string, count = 5) {
    const { body, status } = await supertest
      .post(`/internal/ml/jobs/top_categories`)
      .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
      .set(getCommonRequestHeader('1'))
      .send({ jobId, count });
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  async function runGetCategoryRequest(
    jobId: string,
    categoryId: string,
    expectedStatusCode = 200
  ) {
    const { body, status } = await supertest
      .get(`/internal/ml/anomaly_detectors/${jobId}/results/categories/${categoryId}`)
      .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('Categorization job results', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/categorization_small');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createAnomalyDetectionJob(job);
      await ml.api.createDatafeed(datafeed);
      await ml.api.openAnomalyDetectionJob(job.job_id);
      await ml.api.startDatafeed(catDatafeedId, { start: '0', end: String(Date.now()) });
      await ml.api.waitForDatafeedState(catDatafeedId, DATAFEED_STATE.STOPPED);
      await ml.api.waitForJobState(catJobId, JOB_STATE.CLOSED);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should have the correct top categories', async () => {
      const result = await runTopCategoriesRequest(catJobId);
      expect(result).to.eql(expectedTopCategories);
    });

    it('should get the correct category', async () => {
      const result = await runGetCategoryRequest(catJobId, '3');
      expect(result.count).to.eql(1);
      expect(result.categories[0]).to.eql(expectedCategory3);
    });

    it('should not find the category ID', async () => {
      await runGetCategoryRequest('no-job', '3', 404);
    });

    it('should not find a category', async () => {
      const result = await runGetCategoryRequest(catJobId, '9999');
      expect(result.count).to.eql(0);
      expect(result.categories.length).to.eql(0);
    });
  });
};
