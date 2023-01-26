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
import {
  deleteAllCaseItems,
  findCases,
  getCase,
} from '../../../cases_api_integration/common/lib/api';
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
  const es = getService('es');
  const common = getPageObject('common');
  const retry = getService('retry');

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
   * x-pack/test/functional_with_es_ssl/plugins/cases/public/plugin.ts
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
            formBased: {
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
        await retry.waitFor(
          'actions accordion to exist',
          async () => await find.existsByCssSelector('.lnsExpressionRenderer')
        );
      });
    });

    /**
     * The UI of the cases fixture plugin is in x-pack/test/functional_with_es_ssl/plugins/cases/public/application.tsx
     */
    describe('Attachment hooks', () => {
      const TOTAL_OWNERS = ['cases', 'securitySolution', 'observability'];

      const ensureFirstCommentOwner = async (caseId: string, owner: string) => {
        const theCase = await getCase({
          supertest,
          caseId,
          includeComments: true,
        });

        const comment = theCase.comments![0].owner;
        expect(comment).toBe(owner);
      };

      before(async () => {
        await common.navigateToApp('cases_fixture');
      });

      describe('Flyout', () => {
        const openFlyout = async () => {
          await common.clickAndValidate('case-fixture-attach-to-new-case', 'create-case-flyout');
        };

        const closeFlyout = async () => {
          await testSubjects.click('euiFlyoutCloseButton');
        };

        after(async () => {
          await deleteAllCaseItems(es);
        });

        it('renders solutions selection', async () => {
          await openFlyout();

          for (const owner of TOTAL_OWNERS) {
            await testSubjects.existOrFail(`${owner}RadioButton`);
          }

          await closeFlyout();
        });

        it('attaches correctly', async () => {
          for (const owner of TOTAL_OWNERS) {
            await openFlyout();

            /**
             * The flyout close automatically after submitting a case
             */
            await cases.create.createCase({ owner });
            await cases.common.expectToasterToContain('has been updated');
          }

          const casesCreatedFromFlyout = await findCases({ supertest });

          for (const owner of TOTAL_OWNERS) {
            const theCase = casesCreatedFromFlyout.cases.find((c) => c.owner === owner)!;
            await ensureFirstCommentOwner(theCase.id, owner);
          }
        });
      });

      describe('Modal', () => {
        const createdCases = new Map<string, string>();

        const openModal = async () => {
          await common.clickAndValidate('case-fixture-attach-to-existing-case', 'all-cases-modal');
          await cases.casesTable.waitForTableToFinishLoading();
        };

        const closeModal = async () => {
          await find.clickByCssSelector('[data-test-subj="all-cases-modal"] > button');
        };

        before(async () => {
          for (const owner of TOTAL_OWNERS) {
            const theCase = await cases.api.createCase({ owner });
            createdCases.set(owner, theCase.id);
          }
        });

        after(async () => {
          await deleteAllCaseItems(es);
        });

        it('renders different solutions', async () => {
          await openModal();

          await testSubjects.existOrFail('options-filter-popover-button-Solution');

          for (const [owner, caseId] of createdCases.entries()) {
            await testSubjects.existOrFail(`cases-table-row-${caseId}`);
            await testSubjects.existOrFail(`case-table-column-owner-icon-${owner}`);
          }

          await closeModal();
        });

        it('filters correctly', async () => {
          for (const [owner, currentCaseId] of createdCases.entries()) {
            await openModal();

            await cases.casesTable.filterByOwner(owner);
            await cases.casesTable.waitForTableToFinishLoading();
            await testSubjects.existOrFail(`cases-table-row-${currentCaseId}`);

            /**
             * We ensure that the other cases are not shown
             */
            for (const otherCaseId of createdCases.values()) {
              if (otherCaseId !== currentCaseId) {
                await testSubjects.missingOrFail(`cases-table-row-${otherCaseId}`);
              }
            }

            await closeModal();
          }
        });

        it('attaches correctly', async () => {
          for (const [owner, currentCaseId] of createdCases.entries()) {
            await openModal();

            await cases.casesTable.waitForTableToFinishLoading();
            await testSubjects.existOrFail(`cases-table-row-${currentCaseId}`);
            await testSubjects.click(`cases-table-row-select-${currentCaseId}`);

            await cases.common.expectToasterToContain('has been updated');
            await ensureFirstCommentOwner(currentCaseId, owner);
          }
        });
      });
    });
  });
};
