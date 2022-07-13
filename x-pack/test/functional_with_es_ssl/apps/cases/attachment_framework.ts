/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ExternalReferenceStorageType,
  CommentType,
  CaseResponse,
  CommentRequest,
} from '@kbn/cases-plugin/common/api';
import { expect } from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const createLogStashDataView = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>
): Promise<{ data_view: { id: string } }> => {
  const { body } = await supertest
    .post(`/api/data_views/data_view`)
    .set('kbn-xsrf', 'foo')
    .send({ data_view: { title: 'logstash-*', name: 'logstash', timeFieldName: '@timestamp' } })
    .expect(200);

  return body;
};

const deleteLogStashDataView = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  dataViewId: string
): Promise<void> => {
  await supertest
    .delete(`/api/saved_objects/index-pattern/${dataViewId}`)
    .query({ force: true })
    .set('kbn-xsrf', 'foo')
    .send()
    .expect(200);
};

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const find = getService('find');

  const createAttachmentAndNavigate = async (attachment: CommentRequest) => {
    const caseData = await cases.api.createCase({
      title: `Registered attachment of type ${attachment.type}`,
    });
    const caseWithAttachment = await cases.api.createAttachment({
      caseId: caseData.id,
      params: attachment,
    });

    await cases.navigation.navigateToApp();
    await cases.casesTable.waitForCasesToBeListed();
    await cases.casesTable.goToFirstListedCase();
    await header.waitUntilLoadingHasFinished();

    return caseWithAttachment;
  };

  const validateAttachment = async (type: string, attachmentId?: string) => {
    await testSubjects.existOrFail(`comment-${type}-.test`);
    await testSubjects.existOrFail(`copy-link-${attachmentId}`);
    await testSubjects.existOrFail('test-attachment-action');
  };

  /**
   * Attachment types are being registered in
   * x-pack/test/functional_with_es_ssl/fixtures/plugins/cases/public/plugin.ts
   */
  describe('Attachment framework', () => {
    describe('External reference attachments', () => {
      let caseWithAttachment: CaseResponse;

      before(async () => {
        caseWithAttachment = await createAttachmentAndNavigate({
          type: CommentType.externalReference,
          externalReferenceId: 'my-id',
          externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
          externalReferenceAttachmentTypeId: '.test',
          externalReferenceMetadata: null,
          owner: 'cases',
        });
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('renders an external reference attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await validateAttachment(CommentType.externalReference, attachmentId);
        await testSubjects.existOrFail('test-attachment-content');
      });
    });

    describe('Persistable state attachments', () => {
      const getLensState = (dataViewId: string) => ({
        title: '',
        visualizationType: 'lnsXY',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: 'indexpattern-datasource-layer-85863a23-73a0-4e11-9774-70f77b9a5898',
          },
        ],
        state: {
          visualization: {
            legend: { isVisible: true, position: 'right' },
            valueLabels: 'hide',
            fittingFunction: 'None',
            axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
            tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
            labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
            gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: '85863a23-73a0-4e11-9774-70f77b9a5898',
                accessors: ['63810bd4-8481-4aab-822a-532d8513a8b1'],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                layerType: 'data',
                xAccessor: 'ab807e89-c453-415b-8eb4-3986de52c923',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
          datasourceStates: {
            indexpattern: {
              layers: {
                '85863a23-73a0-4e11-9774-70f77b9a5898': {
                  columns: {
                    'ab807e89-c453-415b-8eb4-3986de52c923': {
                      label: '@timestamp',
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: '@timestamp',
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', includeEmptyRows: true, dropPartials: false },
                    },
                    '63810bd4-8481-4aab-822a-532d8513a8b1': {
                      label: 'Median of id',
                      dataType: 'number',
                      operationType: 'median',
                      sourceField: 'id',
                      isBucketed: false,
                      scale: 'ratio',
                      params: { emptyAsNull: true },
                    },
                  },
                  columnOrder: [
                    'ab807e89-c453-415b-8eb4-3986de52c923',
                    '63810bd4-8481-4aab-822a-532d8513a8b1',
                  ],
                  incompleteColumns: {},
                },
              },
            },
          },
        },
      });

      let caseWithAttachment: CaseResponse;
      let dataViewId = '';

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        const res = await createLogStashDataView(supertest);
        dataViewId = res.data_view.id;

        caseWithAttachment = await createAttachmentAndNavigate({
          type: CommentType.persistableState,
          persistableStateAttachmentTypeId: '.test',
          persistableStateAttachmentState: getLensState(dataViewId),
          owner: 'cases',
        });
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await deleteLogStashDataView(supertest, dataViewId);
        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      });

      it('renders a persistable attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await validateAttachment(CommentType.persistableState, attachmentId);
        expect(await find.existsByCssSelector('.lnsExpressionRenderer')).toBe(true);
      });
    });
  });
};
