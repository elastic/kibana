/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { secOnly } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  updateObservable,
  deleteObservable,
  getCase,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

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

      it('can returns bad request when observable value does not pass validation', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: 'not ip actually',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
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

      it('returns bad request when observable value does not pass validation', async () => {
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

        await updateObservable({
          supertest,
          params: { observable: { description: '', value: 'not ip' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
          expectedHttpCode: 400,
        });
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

    describe('rbac', () => {
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
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('should not allow deleting an observable without permissions', async () => {
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
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          observableId: observable.id as string,
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('should not allow updating an observable without premissions', async () => {
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

        await updateObservable({
          supertest: supertestWithoutAuth,
          params: { observable: { description: '', value: '192.168.68.1' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
