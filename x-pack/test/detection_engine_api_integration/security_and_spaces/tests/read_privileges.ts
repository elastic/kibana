/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../plugins/security_solution/common/constants';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('read_privileges', () => {
    it('should return expected privileges for elastic admin', async () => {
      const { body } = await supertest.get(DETECTION_ENGINE_PRIVILEGES_URL).send().expect(200);
      expect(body).to.eql({
        username: 'elastic',
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

    it('should return expected privileges for a "reader" user', async () => {
      await createUserAndRole(getService, ROLES.reader);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.reader, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'reader',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
            manage_ilm: false,
            read: true,
            create_index: false,
            read_cross_cluster: false,
            index: false,
            monitor: false,
            delete: false,
            manage: false,
            delete_index: false,
            create_doc: false,
            view_index_metadata: true,
            create: false,
            manage_follow_index: false,
            manage_leader_index: false,
            maintenance: true,
            write: false,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
      await deleteUserAndRole(getService, ROLES.reader);
    });

    it('should return expected privileges for a "t1_analyst" user', async () => {
      await createUserAndRole(getService, ROLES.t1_analyst);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.t1_analyst, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 't1_analyst',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
            manage_ilm: false,
            read: true,
            create_index: false,
            read_cross_cluster: false,
            index: true,
            monitor: false,
            delete: true,
            manage: false,
            delete_index: false,
            create_doc: true,
            view_index_metadata: false,
            create: true,
            manage_follow_index: false,
            manage_leader_index: false,
            maintenance: true,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
      await deleteUserAndRole(getService, ROLES.t1_analyst);
    });

    it('should return expected privileges for a "t2_analyst" user', async () => {
      await createUserAndRole(getService, ROLES.t2_analyst);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.t2_analyst, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 't2_analyst',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
            manage_ilm: false,
            read: true,
            create_index: false,
            read_cross_cluster: false,
            index: true,
            monitor: false,
            delete: true,
            manage: false,
            delete_index: false,
            create_doc: true,
            view_index_metadata: false,
            create: true,
            manage_follow_index: false,
            manage_leader_index: false,
            maintenance: true,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
      await deleteUserAndRole(getService, ROLES.t2_analyst);
    });

    it('should return expected privileges for a "hunter" user', async () => {
      await createUserAndRole(getService, ROLES.hunter);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.hunter, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'hunter',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
            manage_ilm: false,
            read: true,
            create_index: false,
            read_cross_cluster: false,
            index: true,
            monitor: false,
            delete: true,
            manage: false,
            delete_index: false,
            create_doc: true,
            view_index_metadata: false,
            create: true,
            manage_follow_index: false,
            manage_leader_index: false,
            maintenance: false,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
      await deleteUserAndRole(getService, ROLES.hunter);
    });

    it('should return expected privileges for a "rule_author" user', async () => {
      await createUserAndRole(getService, ROLES.rule_author);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.rule_author, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'rule_author',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
            manage_ilm: false,
            read: true,
            create_index: false,
            read_cross_cluster: false,
            index: true,
            monitor: false,
            delete: true,
            manage: false,
            delete_index: false,
            create_doc: true,
            view_index_metadata: true,
            create: true,
            manage_follow_index: false,
            manage_leader_index: false,
            maintenance: true,
            write: true,
          },
        },
        application: {},
        is_authenticated: true,
        has_encryption_key: true,
      });
      await deleteUserAndRole(getService, ROLES.rule_author);
    });

    it('should return expected privileges for a "soc_manager" user', async () => {
      await createUserAndRole(getService, ROLES.soc_manager);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.soc_manager, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'soc_manager',
        has_all_requested: false,
        cluster: {
          monitor_ml: false,
          manage_ccr: false,
          manage_index_templates: false,
          monitor_watcher: false,
          monitor_transform: false,
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
          manage_transform: false,
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
      await deleteUserAndRole(getService, ROLES.soc_manager);
    });

    it('should return expected privileges for a "platform_engineer" user', async () => {
      await createUserAndRole(getService, ROLES.platform_engineer);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.platform_engineer, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'platform_engineer',
        has_all_requested: false,
        cluster: {
          monitor_ml: true,
          manage_ccr: false,
          manage_index_templates: true,
          monitor_watcher: true,
          monitor_transform: true,
          read_ilm: true,
          manage_api_key: false,
          manage_security: false,
          manage_own_api_key: false,
          manage_saml: false,
          all: false,
          manage_ilm: true,
          manage_ingest_pipelines: true,
          read_ccr: false,
          manage_rollup: true,
          monitor: true,
          manage_watcher: true,
          manage: true,
          manage_transform: true,
          manage_token: false,
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
      await deleteUserAndRole(getService, ROLES.platform_engineer);
    });

    it('should return expected privileges for a "detections_admin" user', async () => {
      await createUserAndRole(getService, ROLES.detections_admin);
      const { body } = await supertestWithoutAuth
        .get(DETECTION_ENGINE_PRIVILEGES_URL)
        .auth(ROLES.detections_admin, 'changeme')
        .send()
        .expect(200);
      expect(body).to.eql({
        username: 'detections_admin',
        has_all_requested: false,
        cluster: {
          monitor_ml: true,
          manage_ccr: false,
          manage_index_templates: true,
          monitor_watcher: true,
          monitor_transform: true,
          read_ilm: true,
          manage_api_key: false,
          manage_security: false,
          manage_own_api_key: false,
          manage_saml: false,
          all: false,
          manage_ilm: true,
          manage_ingest_pipelines: true,
          read_ccr: false,
          manage_rollup: true,
          monitor: true,
          manage_watcher: true,
          manage: true,
          manage_transform: true,
          manage_token: false,
          manage_ml: true,
          manage_pipeline: true,
          monitor_rollup: true,
          transport_client: true,
          create_snapshot: true,
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
      await deleteUserAndRole(getService, ROLES.detections_admin);
    });
  });
};
