/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { eventsIndexPattern } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { ResolverEntityIndex } from '@kbn/security-solution-plugin/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Resolver tests for the entity route', () => {
    describe('winlogbeat tests', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/endpoint/resolver/winlogbeat');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/endpoint/resolver/winlogbeat');
      });

      it('returns a winlogbeat sysmon event when the event matches the schema correctly', async () => {
        // this id is from the es archive
        const _id = 'sysmon-event';
        const { body }: { body: ResolverEntityIndex } = await supertest.get(
          `/api/endpoint/resolver/entity?_id=${_id}&indices=${eventsIndexPattern}&indices=winlogbeat-7.11.0-default`
        );
        expect(body).eql([
          {
            name: 'winlogbeat',
            schema: {
              id: 'process.entity_id',
              parent: 'process.parent.entity_id',
              name: 'process.name',
            },
            // this value is from the es archive
            id: '{98da333e-2060-5fc9-2e01-000000003f00}',
          },
        ]);
      });

      it('does not return a powershell event that has event.module set to powershell', async () => {
        // this id is from the es archive
        const _id = 'powershell-event';
        const { body }: { body: ResolverEntityIndex } = await supertest.get(
          `/api/endpoint/resolver/entity?_id=${_id}&indices=${eventsIndexPattern}&indices=winlogbeat-7.11.0-default`
        );
        expect(body).to.be.empty();
      });
    });

    describe('signals index mapping tests', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/endpoint/resolver/signals');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/endpoint/resolver/signals');
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
            id: 'MTIwNWY1NWQtODRkYS00MzkxLWIyNWQtYTNkNGJmNDBmY2E1LTc1NTItMTMyNDM1NDY1MTQuNjI0MjgxMDA=',
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
  });
}
