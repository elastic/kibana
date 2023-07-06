/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  MAIN_SAVED_OBJECT_INDEX,
  ALERTING_CASES_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import {
  deleteAllCaseItems,
  getCaseCommentSavedObjectsFromES,
  getCaseSavedObjectsFromES,
  getCaseUserActionsSavedObjectsFromES,
  getConfigureSavedObjectsFromES,
} from '../../../common/lib/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Kibana index: Alerting & Cases', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/8.8.0');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/8.8.0');
      await deleteAllCaseItems(es);
    });

    it(`migrates the ${CASE_SAVED_OBJECT} SO from the ${MAIN_SAVED_OBJECT_INDEX} index to the ${ALERTING_CASES_SAVED_OBJECT_INDEX} correctly`, async () => {
      const res = await getCaseSavedObjectsFromES({ es });
      const cases = res.body.hits.hits;

      expect(cases.length).to.be(1);
      expect(cases[0]._source?.cases).to.eql({
        assignees: [],
        closed_at: null,
        closed_by: null,
        connector: { fields: [], name: 'none', type: '.none' },
        created_at: '2023-04-19T08:14:05.032Z',
        created_by: {
          email: null,
          full_name: null,
          profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          username: 'elastic',
        },
        description: 'cases in the new index',
        duration: null,
        external_service: null,
        owner: 'cases',
        settings: { syncAlerts: false },
        severity: 0,
        status: 0,
        tags: ['new index', 'test'],
        title: 'cases in the new index',
        total_alerts: -1,
        total_comments: -1,
        updated_at: '2023-04-19T08:14:18.693Z',
        updated_by: {
          email: null,
          full_name: null,
          profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          username: 'elastic',
        },
      });
    });

    it(`migrates the ${CASE_COMMENT_SAVED_OBJECT} SO from the ${MAIN_SAVED_OBJECT_INDEX} index to the ${ALERTING_CASES_SAVED_OBJECT_INDEX} correctly`, async () => {
      const res = await getCaseCommentSavedObjectsFromES({ es });
      const comments = res.body.hits.hits;

      expect(comments.length).to.be(1);
      expect(comments[0]._source?.['cases-comments']).to.eql({
        comment: 'This is amazing!',
        created_at: '2023-04-19T08:14:11.290Z',
        created_by: {
          email: null,
          full_name: null,
          profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          username: 'elastic',
        },
        owner: 'cases',
        pushed_at: null,
        pushed_by: null,
        type: 'user',
        updated_at: null,
        updated_by: null,
      });
    });

    it(`migrates the ${CASE_USER_ACTION_SAVED_OBJECT} SO from the ${MAIN_SAVED_OBJECT_INDEX} index to the ${ALERTING_CASES_SAVED_OBJECT_INDEX} correctly`, async () => {
      const res = await getCaseUserActionsSavedObjectsFromES({ es });
      const userActions = res.body.hits.hits.map(
        (userAction) => userAction._source?.['cases-user-actions']
      );

      expect(userActions.length).to.be(3);
      expect(userActions).to.eql([
        {
          action: 'create',
          created_at: '2023-04-19T08:14:05.052Z',
          created_by: {
            email: null,
            full_name: null,
            profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            username: 'elastic',
          },
          owner: 'cases',
          payload: {
            assignees: [],
            connector: {
              fields: null,
              name: 'none',
              type: '.none',
            },
            description: 'cases in the new index',
            owner: 'cases',
            settings: {
              syncAlerts: false,
            },
            severity: 'low',
            status: 'open',
            tags: [],
            title: 'cases in the new index',
          },
          type: 'create_case',
        },
        {
          action: 'create',
          created_at: '2023-04-19T08:14:11.318Z',
          created_by: {
            email: null,
            full_name: null,
            profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            username: 'elastic',
          },
          owner: 'cases',
          payload: {
            comment: {
              comment: 'This is amazing!',
              owner: 'cases',
              type: 'user',
            },
          },
          type: 'comment',
        },
        {
          action: 'add',
          created_at: '2023-04-19T08:14:18.719Z',
          created_by: {
            email: null,
            full_name: null,
            profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            username: 'elastic',
          },
          owner: 'cases',
          payload: {
            tags: ['new index', 'test'],
          },
          type: 'tags',
        },
      ]);
    });

    it(`migrates the ${CASE_CONFIGURE_SAVED_OBJECT} SO from the ${MAIN_SAVED_OBJECT_INDEX} index to the ${ALERTING_CASES_SAVED_OBJECT_INDEX} correctly`, async () => {
      const res = await getConfigureSavedObjectsFromES({ es });
      const configure = res.body.hits.hits;

      expect(configure.length).to.be(1);
      expect(configure[0]._source?.['cases-configure']).to.eql({
        closure_type: 'close-by-user',
        connector: { fields: [], name: 'none', type: '.none' },
        created_at: '2023-04-19T08:14:42.212Z',
        created_by: {
          email: null,
          full_name: null,
          profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          username: 'elastic',
        },
        owner: 'cases',
        updated_at: '2023-04-19T08:14:44.202Z',
        updated_by: {
          email: null,
          full_name: null,
          profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          username: 'elastic',
        },
      });
    });
  });
};
