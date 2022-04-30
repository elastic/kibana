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

  describe('import_export_rules_flow', () => {
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
        },
      ]);
    });
  });
};
