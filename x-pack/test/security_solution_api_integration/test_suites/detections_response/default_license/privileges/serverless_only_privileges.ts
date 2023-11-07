/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@serverless Privileges', () => {
    it('should return expected privileges for elastic admin', async () => {
      const { body } = await supertest.get(DETECTION_ENGINE_PRIVILEGES_URL).send().expect(200);
      expect(body).to.eql({
        username: 'elastic_serverless',
        has_all_requested: true,
        cluster: {
          monitor_ml: true,
          manage_ccr: true,
          manage_index_templates: true,
          monitor_watcher: true,
          monitor_transform: true,
          read_ilm: true,
          manage_api_key: true,
          manage_security: true,
          manage_own_api_key: true,
          manage_saml: true,
          all: true,
          manage_ilm: true,
          manage_ingest_pipelines: true,
          read_ccr: true,
          manage_rollup: true,
          monitor: true,
          manage_watcher: true,
          manage: true,
          manage_transform: true,
          manage_token: true,
          manage_ml: true,
          manage_pipeline: true,
          monitor_rollup: true,
          transport_client: true,
          create_snapshot: true,
        },
        index: {
          '.alerts-security.alerts-default': {
            all: true,
            manage_ilm: true,
            read: true,
            create_index: true,
            read_cross_cluster: true,
            index: true,
            monitor: true,
            delete: true,
            manage: true,
            delete_index: true,
            create_doc: true,
            view_index_metadata: true,
            create: true,
            manage_follow_index: true,
            manage_leader_index: true,
            maintenance: true,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
    });

    it('should return expected privileges for a "detections_admin" user', async () => {
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.detections_admin, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'detections_admin',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: true,
          monitor_watcher: false,
          monitor_transform: true,
          read_ilm: false,
          manage_api_key: false,
          manage_security: false,
          manage_own_api_key: false,
          manage_saml: false,
          all: false,
          manage_ilm: false,
          manage_ingest_pipelines: false,
          read_ccr: false,
          manage_rollup: false,
          monitor: false,
          manage_watcher: false,
          manage: false,
          manage_transform: true,
          manage_token: false,
          manage_ml: false,
          manage_pipeline: false,
          monitor_rollup: false,
          transport_client: false,
          create_snapshot: false,
        },
        index: {
          '.alerts-security.alerts-default': {
            all: false,
            manage_ilm: true,
            read: true,
            create_index: true,
            read_cross_cluster: false,
            index: true,
            monitor: true,
            delete: true,
            manage: true,
            delete_index: true,
            create_doc: true,
            view_index_metadata: true,
            create: true,
            manage_follow_index: true,
            manage_leader_index: true,
            maintenance: true,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
    });
  });
};
