/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createCase, deleteAllCaseItems } from '../../../../common/lib/utils';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { getConnectors } from '../../../../common/lib/connectors';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_connectors', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('does not return the connectors for a case that does not have connectors', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());

      const connectors = await getConnectors({ caseId: postedCase.id, supertest });
      expect(Object.keys(connectors).length).to.be(0);
    });
  });
};
