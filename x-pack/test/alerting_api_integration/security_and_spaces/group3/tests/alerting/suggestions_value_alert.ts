/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createRuleSuggestionValuesTests({ getService }: FtrProviderContext) {
  const space1 = Spaces[0].id;

  describe('alerts/suggestions/values', () => {
    const esArchiver = getService('esArchiver');
    const supertest = getService('supertest');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.1.0');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alerts/8.1.0');
    });

    it('Get service.name value suggestion in default space for super user', async () => {
      const response = await supertest
        .post(`${getUrlPrefix('default')}/internal/alerts/suggestions/values`)
        .set('kbn-xsrf', 'foo')
        .send({
          field: 'service.name',
          filters: [],
          query: 'op',
        });
      expect(response.body).toEqual(expect.arrayContaining(['opbeans-python', 'opbeans-java']));
    });

    it('Get service.name value suggestion in space 1 for super user', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerts/suggestions/values`)
        .set('kbn-xsrf', 'foo')
        .send({
          field: 'service.name',
          filters: [],
          query: 'op',
        });
      expect(response.body).toEqual([]);
    });
  });
}
