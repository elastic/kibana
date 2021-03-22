/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { deleteAllCaseItems } from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/cases/common/api/helpers';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_sub_case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return a 400 when accessing the sub case GET route', async () => {
      await supertest
        .get(getSubCaseDetailsUrl('case-id', 'sub-case-id'))
        .set('kbn-xsrf', 'true')
        .expect(404);
    });
  });
};
