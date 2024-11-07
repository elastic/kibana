/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  similarCases,
  updateObservable,
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
      it('allows the assignees field to be an empty array', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          isIoc: false,
          hasBeenSighted: false,
          value: 'test',
          typeKey: '0ad4bf8e-575f-49ad-87ea-8bcafd5173e4',
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
    });

    describe('shows similar cases', () => {
      it('returns cases similar to given case', async () => {
        const [caseA, caseB] = await Promise.all([
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
        ]);

        const newObservableData = {
          isIoc: false,
          hasBeenSighted: false,
          value: 'test',
          typeKey: '0ad4bf8e-575f-49ad-87ea-8bcafd5173e4',
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
          isIoc: false,
          hasBeenSighted: false,
          value: 'test',
          typeKey: '0ad4bf8e-575f-49ad-87ea-8bcafd5173e4',
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
          params: { observable: { ...newObservableData, value: 'updated' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
        });

        expect(updatedObservable.observables[0].value).to.be('updated');
      });
    });
  });
};
