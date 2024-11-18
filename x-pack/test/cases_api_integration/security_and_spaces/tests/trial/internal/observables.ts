/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPES_BUILTIN, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { secOnlyRead } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  similarCases,
  updateObservable,
  deleteObservable,
  getCase,
} from '../../../../common/lib/api';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('observables', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('add observable to a case', () => {
      it('can add an observable to a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const updatedCase = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        expect(updatedCase.observables.length).to.be.greaterThan(0);
      });

      it('returns bad request when using unknown observable type', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: 'test',
          typeKey: 'unknown type',
          description: '',
        };

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('shows similar cases', () => {
      it('returns cases similar to given case', async () => {
        const [caseA, caseB] = await Promise.all([
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
        ]);

        const newObservableData = {
          value: 'value',
          typeKey: OBSERVABLE_TYPES_BUILTIN[0].key,
          description: '',
        };

        const { cases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });
        expect(cases.length).to.be(0);

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: {
            observable: newObservableData,
          },
        });

        await addObservable({
          supertest,
          caseId: caseB.id,
          params: {
            observable: newObservableData,
          },
        });

        const { cases: casesSimilarToA } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });

        expect(casesSimilarToA.length).to.be(1);

        const { cases: casesSimilarToB } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseB.id,
        });

        expect(casesSimilarToB.length).to.be(1);
      });

      it('returns cases similar to given case with json in the value', async () => {
        const [caseA, caseB] = await Promise.all([
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
        ]);

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const { cases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });
        expect(cases.length).to.be(0);

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: {
            observable: newObservableData,
          },
        });

        await addObservable({
          supertest,
          caseId: caseB.id,
          params: {
            observable: newObservableData,
          },
        });

        const { cases: casesAfterObservablesAreAdded } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });

        expect(casesAfterObservablesAreAdded.length).to.be(1);
      });
    });

    describe('update observable', () => {
      it('updates an observable on a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        const updatedObservable = await updateObservable({
          supertest,
          params: { observable: { description: '', value: '192.168.68.1' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
        });

        expect(updatedObservable.observables[0].value).to.be('192.168.68.1');
      });
    });

    describe('delete observable', () => {
      it('deletes an observable on a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        await deleteObservable({
          supertest,
          caseId: postedCase.id,
          observableId: observable.id as string,
          expectedHttpCode: 204,
        });

        const { observables } = await getCase({ supertest, caseId: postedCase.id });

        expect(observables.length).to.be(0);
      });
    });

    // TODO: discuss how this should be configured exactly
    describe.skip('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should not allow creating observables without permissions', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        await addObservable({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
          auth: { user: secOnlyRead, space: 'space1' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
