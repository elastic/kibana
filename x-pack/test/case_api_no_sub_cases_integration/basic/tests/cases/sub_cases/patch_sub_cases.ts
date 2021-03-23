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
  const esArchiver = getService('esArchiver');

  describe('patch_sub_cases', () => {
    beforeEach(async () => {
      await esArchiver.load('cases/signals/default');
    });
    afterEach(async () => {
      await esArchiver.unload('cases/signals/default');
      await deleteAllCaseItems(es);
    });

    it('should fail to find the patch route for sub cases', async () => {
      await supertest
        .patch(SUB_CASES_PATCH_DEL_URL)
        .set('kbn-xsrf', 'true')
        .send({ subCases: [] })
        .expect(404);
    });
  });
}
