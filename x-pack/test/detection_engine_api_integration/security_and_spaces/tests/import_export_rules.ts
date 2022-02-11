/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import { deleteAllExceptions } from '../../../lists_api_integration/utils';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  binaryToString,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getWebHookAction,
} from '../../utils';
import { ROLES } from '../../../../plugins/security_solution/common/test';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';

// This test was meant to be more full flow, ensuring that
// exported rules are able to be reimported as opposed to
// testing the import/export functionality separately
// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe.only('import_export_rules_flow', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
      await createUserAndRole(getService, ROLES.soc_manager);
    });

    afterEach(async () => {
      await deleteUserAndRole(getService, ROLES.soc_manager);
      await deleteAllExceptions(supertest, log);
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should be able to reimport a rule with all values filled out', async () => {
      // create a new action
      const { body: hookAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .expect(200);

      const action = {
        group: 'default',
        id: hookAction.id,
        action_type_id: hookAction.actionTypeId,
        params: {},
      };

      // create an exception list
      const { body: exceptionBody } = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);

      // create an exception list item
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListItemMinimalSchemaMock())
        .expect(200);

      await createRule(supertest, log, {
        actions: [action],
        name: 'Query with all possible fields filled out',
        description: 'Kitchen Sink (everything) query that has all possible fields filled out',
        false_positives: [
          'https://www.example.com/some-article-about-a-false-positive',
          'some text string about why another condition could be a false positive',
        ],
        rule_id: 'rule-id-everything',
        filters: [
          {
            query: {
              match_phrase: {
                'host.name': 'siem-windows',
              },
            },
          },
          {
            exists: {
              field: 'host.hostname',
            },
          },
        ],
        enabled: false,
        exceptions_list: [
          {
            id: exceptionBody.id,
            list_id: exceptionBody.list_id,
            type: exceptionBody.type,
            namespace_type: exceptionBody.namespace_type,
          },
        ],
        index: ['auditbeat-*', 'filebeat-*'],
        interval: '5m',
        query: 'user.name: root or user.name: admin',
        output_index: '.siem-signals-default',
        meta: {
          anything_you_want_ui_related_or_otherwise: {
            as_deep_structured_as_you_need: {
              any_data_type: {},
            },
          },
        },
        language: 'kuery',
        risk_score: 1,
        max_signals: 100,
        tags: ['tag 1', 'tag 2', 'any tag you want'],
        to: 'now',
        from: 'now-6m',
        severity: 'high',
        type: 'query',
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0040',
              name: 'impact',
              reference: 'https://attack.mitre.org/tactics/TA0040/',
            },
            technique: [
              {
                id: 'T1499',
                name: 'endpoint denial of service',
                reference: 'https://attack.mitre.org/techniques/T1499/',
              },
            ],
          },
          {
            framework: 'Some other Framework you want',
            tactic: {
              id: 'some-other-id',
              name: 'Some other name',
              reference: 'https://example.com',
            },
            technique: [
              {
                id: 'some-other-id',
                name: 'some other technique name',
                reference: 'https://example.com',
              },
            ],
          },
        ],
        references: [
          'http://www.example.com/some-article-about-attack',
          'Some plain text string here explaining why this is a valid thing to look out for',
        ],
        timeline_id: 'timeline_id',
        timeline_title: 'timeline_title',
        note: '# note markdown',
        version: 1,
      });

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200)
        .parse(binaryToString);

      const { body: importBody } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
        .set('kbn-xsrf', 'true')
        .attach('file', Buffer.from(body), 'rules.ndjson')
        .expect(200);

      expect(importBody).to.eql({
        errors: [],
        success: true,
        success_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 2,
      });
    });

    it('should be able to reimport a rule referencing an exception list with existing comments', async () => {
      // create an exception list
      const { body: exceptionBody } = await supertestWithoutAuth
        .post(EXCEPTION_LIST_URL)
        .auth(ROLES.soc_manager, 'changeme')
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);

      // create an exception list item
      const { body: exceptionItemBody } = await supertestWithoutAuth
        .post(EXCEPTION_LIST_ITEM_URL)
        .auth(ROLES.soc_manager, 'changeme')
        .set('kbn-xsrf', 'true')
        .send({
          ...getCreateExceptionListItemMinimalSchemaMock(),
          comments: [{ comment: 'this exception item rocks' }],
        })
        .expect(200);

      const { body: exceptionItem } = await supertest
        .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(exceptionItem.comments).to.eql([
        {
          comment: 'this exception item rocks',
          created_at: `${exceptionItem.comments[0].created_at}`,
          created_by: 'soc_manager',
          id: `${exceptionItem.comments[0].id}`,
        },
      ]);

      await createRule(supertest, log, {
        ...getSimpleRule(),
        exceptions_list: [
          {
            id: exceptionBody.id,
            list_id: exceptionBody.list_id,
            type: exceptionBody.type,
            namespace_type: exceptionBody.namespace_type,
          },
        ],
      });

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200)
        .parse(binaryToString);

      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
        .set('kbn-xsrf', 'true')
        .attach('file', Buffer.from(body), 'rules.ndjson')
        .expect(200);

      const { body: exceptionItemFind2 } = await supertest
        .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      // NOTE: Existing comment is uploaded successfully
      // however, the meta now reflects who imported it,
      // not who created the initial comment
      expect(exceptionItemFind2.comments).to.eql([
        {
          comment: 'this exception item rocks',
          created_at: `${exceptionItemFind2.comments[0].created_at}`,
          created_by: 'elastic',
          id: `${exceptionItemFind2.comments[0].id}`,
          meta: {
            import_fields: {
              created_at: `${exceptionItem.comments[0].created_at}`,
              created_by: 'soc_manager',
            },
          },
        },
      ]);
    });
  });
};
