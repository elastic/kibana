/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalReferenceStorageType,
  CommentType,
  CaseResponse,
  CommentRequest,
} from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');

  const createAttachmentAndNavigate = async (attachment: CommentRequest) => {
    const caseData = await cases.api.createCase({ title: 'External references' });
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
    await testSubjects.existOrFail('test-attachment-content');
  };

  /**
   * Attachment types are being registered in
   * x-pack/test/functional_with_es_ssl/fixtures/plugins/cases/public/plugin.ts
   */
  describe.only('Attachment framework', () => {
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
      });
    });

    describe.only('Persistable state attachments', () => {
      const lensState = {
        title: '',
        visualizationType: 'lnsXY',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: 'metrics-*',
            name: 'indexpattern-datasource-layer-7fdeee5d-e487-45ff-ae12-f312b6682a5f',
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
                layerId: '7fdeee5d-e487-45ff-ae12-f312b6682a5f',
                accessors: ['989537db-633c-4fd5-acf2-e26e3cd57067'],
                position: 'top',
                seriesType: 'bar_stacked',
                showGridlines: false,
                layerType: 'data',
                xAccessor: '4e40166e-1daa-421a-8ea1-3de791edf59d',
              },
            ],
          },
          query: { query: '', language: 'kuery' },
          filters: [],
          datasourceStates: {
            indexpattern: {
              layers: {
                '7fdeee5d-e487-45ff-ae12-f312b6682a5f': {
                  columns: {
                    '4e40166e-1daa-421a-8ea1-3de791edf59d': {
                      label: 'Top 5 values of agent.id',
                      dataType: 'string',
                      operationType: 'terms',
                      scale: 'ordinal',
                      sourceField: 'agent.id',
                      isBucketed: true,
                      params: {
                        size: 5,
                        orderBy: {
                          type: 'column',
                          columnId: '989537db-633c-4fd5-acf2-e26e3cd57067',
                        },
                        orderDirection: 'desc',
                        otherBucket: true,
                        missingBucket: false,
                        parentFormat: { id: 'terms' },
                      },
                    },
                    '989537db-633c-4fd5-acf2-e26e3cd57067': {
                      label: 'Count of records',
                      dataType: 'number',
                      operationType: 'count',
                      isBucketed: false,
                      scale: 'ratio',
                      sourceField: '___records___',
                      params: { emptyAsNull: true },
                    },
                  },
                  columnOrder: [
                    '4e40166e-1daa-421a-8ea1-3de791edf59d',
                    '989537db-633c-4fd5-acf2-e26e3cd57067',
                  ],
                  incompleteColumns: {},
                },
              },
            },
          },
        },
      };

      let caseWithAttachment: CaseResponse;

      before(async () => {
        caseWithAttachment = await createAttachmentAndNavigate({
          type: CommentType.persistableState,
          persistableStateAttachmentTypeId: '.test',
          persistableStateAttachmentState: lensState,
          owner: 'cases',
        });
      });

      // after(async () => {
      //   await cases.api.deleteAllCases();
      // });

      it('renders a persistable attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await validateAttachment(CommentType.persistableState, attachmentId);
      });
    });
  });
};
