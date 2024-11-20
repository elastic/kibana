/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPES_BUILTIN, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  similarCases,
} from '../../../../common/lib/api';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('similar case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
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
  });
};
