/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { eventsIndexPattern } from '../../../../plugins/security_solution/common/endpoint/constants';
import { ResolverEntityIndex } from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Resolver tests for the entity route', () => {
    before(async () => {
      await esArchiver.load('endpoint/resolver/signals');
    });

    after(async () => {
      await esArchiver.unload('endpoint/resolver/signals');
    });

    it('returns an event even if it does not have a mapping for entity_id', async () => {
      // this id is from the es archive
      const _id = 'fa7eb1546f44fd47d8868be8d74e0082e19f22df493c67a7725457978eb648ab';
      const { body }: { body: ResolverEntityIndex } = await supertest.get(
        `/api/endpoint/resolver/entity?_id=${_id}&indices=${eventsIndexPattern}&indices=.siem-signals-default`
      );
      expect(body).eql([
        {
          name: 'endpoint',
          schema: {
            id: 'process.entity_id',
            parent: 'process.parent.entity_id',
            ancestry: 'process.Ext.ancestry',
            name: 'process.name',
          },
          // this value is from the es archive
          id:
            'MTIwNWY1NWQtODRkYS00MzkxLWIyNWQtYTNkNGJmNDBmY2E1LTc1NTItMTMyNDM1NDY1MTQuNjI0MjgxMDA=',
        },
      ]);
    });

    it('does not return an event when it does not have the entity_id field in the document', async () => {
      // this id is from the es archive
      const _id = 'no-entity-id-field';
      const { body }: { body: ResolverEntityIndex } = await supertest.get(
        `/api/endpoint/resolver/entity?_id=${_id}&indices=${eventsIndexPattern}&indices=.siem-signals-default`
      );
      expect(body).to.be.empty();
    });

    it('does not return an event when it does not have the process field in the document', async () => {
      // this id is from the es archive
      const _id = 'no-process-field';
      const { body }: { body: ResolverEntityIndex } = await supertest.get(
        `/api/endpoint/resolver/entity?_id=${_id}&indices=${eventsIndexPattern}&indices=.siem-signals-default`
      );
      expect(body).to.be.empty();
    });
  });
}
