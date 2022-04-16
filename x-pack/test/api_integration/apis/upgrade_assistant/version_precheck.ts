/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '@kbn/upgrade-assistant-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // Tests only applicable on 7.17
  describe.skip('Elasticsearch version precheck', function () {
    this.onlyEsVersion('>=8');

    describe('Elasticsearch 8.x running against Kibana 7.last', () => {
      describe('Cloud backup status APIs', () => {
        it('returns 426 for GET /cloud_backup_status', async () => {
          await supertest
            .get(`${API_BASE_PATH}/cloud_backup_status`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('Cloud upgrade status APIs', () => {
        it('returns 426 for GET /cluster_upgrade_status', async () => {
          await supertest
            .get(`${API_BASE_PATH}/cluster_upgrade_status`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('Deprecation logging APIs', () => {
        it('returns 426 for GET /deprecation_logging', async () => {
          await supertest
            .get(`${API_BASE_PATH}/deprecation_logging`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for PUT /deprecation_logging', async () => {
          await supertest
            .put(`${API_BASE_PATH}/deprecation_logging`)
            .set('kbn-xsrf', 'xxx')
            .send({
              isEnabled: true,
            })
            .expect(426);
        });

        it('returns 426 for DELETE /deprecation_logging/cache', async () => {
          await supertest
            .delete(`${API_BASE_PATH}/deprecation_logging/cache`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for GET /deprecation_logging/count', async () => {
          await supertest
            .get(`${API_BASE_PATH}/deprecation_logging/count?from=2021-08-23T07:32:34.782Z`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('ES deprecations APIs', () => {
        it('returns 426 for GET /es_deprecations', async () => {
          await supertest
            .get(`${API_BASE_PATH}/es_deprecations`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('Remote clusters APIs', () => {
        it('returns 426 for GET /remote_clusters', async () => {
          await supertest
            .get(`${API_BASE_PATH}/remote_clusters`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('System indices migration APIs', () => {
        it('returns 426 for GET /system_indices_migration', async () => {
          await supertest
            .get(`${API_BASE_PATH}/system_indices_migration`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for POST /system_indices_migration', async () => {
          await supertest
            .post(`${API_BASE_PATH}/system_indices_migration`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('Status APIs', () => {
        it('returns 426 for GET /status', async () => {
          await supertest.get(`${API_BASE_PATH}/status`).set('kbn-xsrf', 'xxx').expect(426);
        });
      });

      describe('Privileges APIs', () => {
        it('returns 426 for GET /privileges', async () => {
          await supertest.get(`${API_BASE_PATH}/privileges`).set('kbn-xsrf', 'xxx').expect(426);
        });
      });

      describe('Index settings APIs', () => {
        it('returns 426 for POST /{indexName}/index_settings', async () => {
          await supertest
            .post(`${API_BASE_PATH}/test_index/index_settings`)
            .set('kbn-xsrf', 'xxx')
            .send({
              settings: ['index_settings'],
            })
            .expect(426);
        });
      });

      describe('Cluster settings APIs', () => {
        it('returns 426 for POST /cluster_settings', async () => {
          await supertest
            .post(`${API_BASE_PATH}/cluster_settings`)
            .set('kbn-xsrf', 'xxx')
            .send({
              settings: ['cluster_settings'],
            })
            .expect(426);
        });
      });

      describe('Machine learning APIs', () => {
        it('returns 426 for GET /ml_snapshots/{jobId}/{snapshotId}', async () => {
          await supertest
            .get(`${API_BASE_PATH}/ml_snapshots/job_1/snapshot_1`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for GET /ml_upgrade_mode', async () => {
          await supertest
            .get(`${API_BASE_PATH}/ml_snapshots/job_1/snapshot_1`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for POST /ml_snapshots', async () => {
          await supertest
            .post(`${API_BASE_PATH}/ml_snapshots`)
            .set('kbn-xsrf', 'xxx')
            .send({
              snapshotId: 'snapshot_1',
              jobId: 'job_1',
            })
            .expect(426);
        });

        it('returns 426 for DELETE /ml_snapshots/{jobId}/{snapshotId}', async () => {
          await supertest
            .delete(`${API_BASE_PATH}/ml_snapshots/job_1/snapshot_1`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });
      });

      describe('Reindex APIs', () => {
        it('returns 426 for POST /reindex/{indexName}', async () => {
          await supertest
            .post(`${API_BASE_PATH}/reindex/test_index`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for GET /reindex/{indexName}', async () => {
          await supertest
            .get(`${API_BASE_PATH}/reindex/test_index`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for POST /reindex/{indexName}/cancel', async () => {
          await supertest
            .post(`${API_BASE_PATH}/reindex/test_index/cancel`)
            .set('kbn-xsrf', 'xxx')
            .send({
              indexNames: ['test_index'],
            })
            .expect(426);
        });

        it('returns 426 for GET /reindex/batch/queue', async () => {
          await supertest
            .get(`${API_BASE_PATH}/reindex/batch/queue`)
            .set('kbn-xsrf', 'xxx')
            .expect(426);
        });

        it('returns 426 for POST /reindex/batch', async () => {
          await supertest
            .post(`${API_BASE_PATH}/reindex/batch`)
            .set('kbn-xsrf', 'xxx')
            .send({
              indexNames: ['test_index'],
            })
            .expect(426);
        });
      });
    });
  });
}
