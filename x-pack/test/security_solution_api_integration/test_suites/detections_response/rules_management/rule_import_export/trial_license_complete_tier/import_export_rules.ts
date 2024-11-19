/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import {
  getCreateExceptionListItemMinimalSchemaMock,
  getCreateExceptionListItemNewerVersionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { binaryToString, getCustomQueryRuleParams } from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../common/services/security_solution';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

// This test was meant to be more full flow, ensuring that
// exported rules are able to be reimported as opposed to
// testing the import/export functionality separately

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  describe('@ess import_export_rules_flow', () => {
    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
      await createUserAndRole(getService, ROLES.soc_manager);
    });

    afterEach(async () => {
      await deleteUserAndRole(getService, ROLES.soc_manager);
      await deleteAllExceptions(supertest, log);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('Endpoint Exception', () => {
      /*
       Following the release of version 8.7, this test can be considered as an evaluation of exporting
       an outdated List Item. A notable distinction lies in the absence of the "expire_time" property
       within the getCreateExceptionListMinimalSchemaMock, which allows for differentiation between older
       and newer versions. The rationale behind this approach is the lack of version tracking for both List and Rule,
       thereby enabling simulation of migration scenarios.
      */
      it('should be able to reimport a rule referencing an old version of endpoint exception list with existing comments', async () => {
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
            ...getCreateExceptionListItemMinimalSchemaMock(), // using Old version of Exception List
            comments: [{ comment: 'this exception item rocks' }],
          })
          .expect(200);

        const { body: exceptionItem } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(exceptionItem.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItem.comments[0].created_at}`,
            created_by: 'soc_manager',
            id: `${exceptionItem.comments[0].id}`,
          },
        ]);

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: exceptionBody.list_id,
                type: exceptionBody.type,
                namespace_type: exceptionBody.namespace_type,
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(body), 'rules.ndjson')
          .expect(200);

        const { body: exceptionItemFind2 } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // NOTE: Existing comment is uploaded successfully
        // however, the meta now reflects who imported it,
        // not who created the initial comment
        expect(exceptionItemFind2.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItemFind2.comments[0].created_at}`,
            created_by: 'elastic',
            id: `${exceptionItemFind2.comments[0].id}`,
          },
        ]);
      });

      it('should be able to reimport a rule referencing a new version of endpoint exception list with existing comments', async () => {
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
            ...getCreateExceptionListItemNewerVersionSchemaMock(), // using newer version of Exception List
            comments: [{ comment: 'this exception item rocks' }],
          })
          .expect(200);

        const { body: exceptionItem } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(exceptionItem.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItem.comments[0].created_at}`,
            created_by: 'soc_manager',
            id: `${exceptionItem.comments[0].id}`,
          },
        ]);

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: exceptionBody.list_id,
                type: exceptionBody.type,
                namespace_type: exceptionBody.namespace_type,
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(body), 'rules.ndjson')
          .expect(200);

        const { body: exceptionItemFind2 } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // NOTE: Existing comment is uploaded successfully
        // however, the meta now reflects who imported it,
        // not who created the initial comment
        expect(exceptionItemFind2.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItemFind2.comments[0].created_at}`,
            created_by: 'elastic',
            id: `${exceptionItemFind2.comments[0].id}`,
          },
        ]);
      });
    });

    describe('Detection Exception', () => {
      /*
       Following the release of version 8.7, this test can be considered as an evaluation of exporting
       an outdated List Item. A notable distinction lies in the absence of the "expire_time" property
       within the getCreateExceptionListMinimalSchemaMock, which allows for differentiation between older
       and newer versions. The rationale behind this approach is the lack of version tracking for both List and Rule,
       thereby enabling simulation of migration scenarios.
      */
      it('should be able to reimport a rule referencing an old version of detection exception list with existing comments', async () => {
        // create an exception list
        const { body: exceptionBody } = await supertestWithoutAuth
          .post(EXCEPTION_LIST_URL)
          .auth(ROLES.soc_manager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        // create an exception list item
        const { body: exceptionItemBody } = await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(ROLES.soc_manager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMock(), // using Old version of Exception List
            comments: [{ comment: 'this exception item rocks' }],
          })
          .expect(200);

        const { body: exceptionItem } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(exceptionItem.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItem.comments[0].created_at}`,
            created_by: 'soc_manager',
            id: `${exceptionItem.comments[0].id}`,
          },
        ]);

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: exceptionBody.list_id,
                type: exceptionBody.type,
                namespace_type: exceptionBody.namespace_type,
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(body), 'rules.ndjson')
          .expect(200);

        const { body: exceptionItemFind2 } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // NOTE: Existing comment is uploaded successfully
        // however, the meta now reflects who imported it,
        // not who created the initial comment
        expect(exceptionItemFind2.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItemFind2.comments[0].created_at}`,
            created_by: 'elastic',
            id: `${exceptionItemFind2.comments[0].id}`,
          },
        ]);
      });

      it('should be able to reimport a rule referencing a new version of detection exception list with existing comments', async () => {
        // create an exception list
        const { body: exceptionBody } = await supertestWithoutAuth
          .post(EXCEPTION_LIST_URL)
          .auth(ROLES.soc_manager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        // create an exception list item
        const { body: exceptionItemBody } = await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(ROLES.soc_manager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemNewerVersionSchemaMock(), // using newer version of Exception List
            comments: [{ comment: 'this exception item rocks' }],
          })
          .expect(200);

        const { body: exceptionItem } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(exceptionItem.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItem.comments[0].created_at}`,
            created_by: 'soc_manager',
            id: `${exceptionItem.comments[0].id}`,
          },
        ]);

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: exceptionBody.list_id,
                type: exceptionBody.type,
                namespace_type: exceptionBody.namespace_type,
              },
            ],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('elastic-api-version', '2023-10-31')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200)
          .parse(binaryToString);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true&overwrite_exceptions=true`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(body), 'rules.ndjson')
          .expect(200);

        const { body: exceptionItemFind2 } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${exceptionItemBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // NOTE: Existing comment is uploaded successfully
        // however, the meta now reflects who imported it,
        // not who created the initial comment
        expect(exceptionItemFind2.comments).toEqual([
          {
            comment: 'this exception item rocks',
            created_at: `${exceptionItemFind2.comments[0].created_at}`,
            created_by: 'elastic',
            id: `${exceptionItemFind2.comments[0].id}`,
          },
        ]);
      });
    });
  });
};
