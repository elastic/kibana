/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { SUB_CASES_PATCH_DEL_URL } from '../../../../../../plugins/cases/common/constants';
import { deleteAllCaseItems } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_sub_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should not delete a sub case', async () => {
      await supertest
        .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["some-invalid-id"]`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });
  });
}
