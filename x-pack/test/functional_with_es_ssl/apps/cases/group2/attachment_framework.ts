/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import {
  ExternalReferenceStorageType,
  AttachmentType,
  Case,
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
} from '@kbn/cases-plugin/common/types/domain';
import { expect } from 'expect';
import { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import {
  deleteAllCaseItems,
  findAttachments,
  findCaseUserActions,
  findCases,
} from '../../../../cases_api_integration/common/lib/api';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ADD_TO_EXISTING_CASE_DATA_TEST_SUBJ = 'embeddablePanelAction-embeddable_addToExistingCase';

const createLogStashDataView = async (
  supertest: SuperTest.Agent
): Promise<{ data_view: { id: string } }> => {
  const { body } = await supertest
    .post(`/api/data_views/data_view`)
    .set('kbn-xsrf', 'foo')
    .send({ data_view: { title: 'logstash-*', name: 'logstash', timeFieldName: '@timestamp' } })
    .expect(200);

  return body;
};

const deleteLogStashDataView = async (
  supertest: SuperTest.Agent,
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
  const kibanaServer = getService('kibanaServer');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const find = getService('find');
  const es = getService('es');
  const common = getPageObject('common');
  const retry = getService('retry');
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const listingTable = getService('listingTable');
  const toasts = getService('toasts');
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const createAttachmentAndNavigate = async (attachment: AttachmentRequest) => {
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

  const validateAttachment = async (type: string, attachmentId?: string | null) => {
    await testSubjects.existOrFail(`comment-${type}-.test`);
    await testSubjects.existOrFail(`copy-link-${attachmentId}`);
    await testSubjects.existOrFail(`attachment-.test-${attachmentId}-arrowRight`);
  };

  /**
   * Attachment types are being registered in
   * x-pack/test/functional_with_es_ssl/plugins/cases/public/plugin.ts
   */
  describe('Attachment framework', () => {
    describe('External reference attachments', () => {
      let caseWithAttachment: Case;
      const externalReferenceAttachment = getExternalReferenceAttachment();

      before(async () => {
        caseWithAttachment = await createAttachmentAndNavigate(externalReferenceAttachment);
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('renders an external reference attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await validateAttachment(AttachmentType.externalReference, attachmentId);
        await testSubjects.existOrFail('test-attachment-content');
      });
    });

    describe('Persistable state attachments', () => {
      let caseWithAttachment: Case;
      let dataViewId = '';

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        const res = await createLogStashDataView(supertest);
        dataViewId = res.data_view.id;

        const persistableStateAttachment = getPersistableStateAttachment(dataViewId);
        caseWithAttachment = await createAttachmentAndNavigate(persistableStateAttachment);
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await deleteLogStashDataView(supertest, dataViewId);
        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      });

      it('renders a persistable attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await validateAttachment(AttachmentType.persistableState, attachmentId);
        await retry.waitFor(
          'persistable state to exist',
          async () => await find.existsByCssSelector('.lnsExpressionRenderer')
        );
      });
    });

    describe('Multiple attachments', () => {
      let originalCase: Case;
      let dataViewId = '';

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        const res = await createLogStashDataView(supertest);
        dataViewId = res.data_view.id;

        originalCase = await cases.api.createCase({
          title: 'Registering multiple attachments',
        });

        const externalReferenceAttachment = getExternalReferenceAttachment();
        const persistableStateAttachment = getPersistableStateAttachment(dataViewId);

        await cases.api.createAttachment({
          caseId: originalCase.id,
          params: externalReferenceAttachment,
        });

        await cases.api.createAttachment({
          caseId: originalCase.id,
          params: persistableStateAttachment,
        });

        await cases.navigation.navigateToApp();
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await deleteLogStashDataView(supertest, dataViewId);
        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      });

      it('renders multiple attachment types correctly', async () => {
        const { userActions } = await findCaseUserActions({
          supertest,
          caseID: originalCase.id,
        });

        const comments = userActions.filter((userAction) => userAction.type === 'comment');

        const externalRefAttachmentId = comments[0].comment_id;
        const persistableStateAttachmentId = comments[1].comment_id;
        await validateAttachment(AttachmentType.externalReference, externalRefAttachmentId);
        await validateAttachment(AttachmentType.persistableState, persistableStateAttachmentId);

        await testSubjects.existOrFail('test-attachment-content');
        await retry.waitFor(
          'persistable state to exist',
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
        const { comments } = await findAttachments({
          supertest,
          caseId,
        });

        expect(comments[0].owner).toBe(owner);
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

          await testSubjects.click('caseOwnerSelector');

          for (const owner of TOTAL_OWNERS) {
            await testSubjects.existOrFail(`${owner}OwnerOption`);
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
            await cases.common.expectToasterToContain('updated');
            await toasts.dismissAllWithChecks();
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
          await testSubjects.missingOrFail('all-cases-modal');
        };

        before(async () => {
          for (const owner of TOTAL_OWNERS) {
            const theCase = await cases.api.createCase({ owner });
            createdCases.set(owner, theCase.id);
          }
        });

        beforeEach(async () => {
          await browser.refresh();
        });

        after(async () => {
          await deleteAllCaseItems(es);
        });

        it('renders different solutions', async () => {
          await openModal();

          await testSubjects.existOrFail('options-filter-popover-button-owner');

          for (const [, currentCaseId] of createdCases.entries()) {
            await cases.casesTable.getCaseById(currentCaseId);
          }

          await closeModal();
        });

        it('filters correctly with owner cases', async () => {
          for (const [owner, currentCaseId] of createdCases.entries()) {
            await openModal();
            await cases.casesTable.filterByOwner(owner);
            await cases.casesTable.getCaseById(currentCaseId);
            /**
             * The select button matched the query of the
             * [data-test-subj*="cases-table-row-" query
             */
            await cases.casesTable.validateCasesTableHasNthRows(2);
            await closeModal();
          }
        });

        it('filters with multiple selection', async () => {
          await openModal();

          for (const [owner] of createdCases.entries()) {
            await cases.casesTable.filterByOwner(owner);
          }

          await cases.casesTable.waitForTableToFinishLoading();

          /**
           * The select button matched the query of the
           * [data-test-subj*="cases-table-row-" query
           */
          await cases.casesTable.validateCasesTableHasNthRows(6);

          for (const caseId of createdCases.values()) {
            await cases.casesTable.getCaseById(caseId);
          }

          await closeModal();
        });

        it('attaches correctly', async () => {
          for (const [owner, currentCaseId] of createdCases.entries()) {
            await openModal();

            await cases.casesTable.waitForTableToFinishLoading();
            await cases.casesTable.getCaseById(currentCaseId);
            await testSubjects.click(`cases-table-row-select-${currentCaseId}`);

            await cases.common.expectToasterToContain('updated');
            await toasts.dismissAllWithChecks();
            await ensureFirstCommentOwner(currentCaseId, owner);
          }
        });
      });
    });

    describe('Lens visualization as persistable attachment', () => {
      const myDashboardName = `My-dashboard-${uuidv4()}`;

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();
        await dashboard.clickNewDashboard();

        // adds lens visualization to dashboard, save and return
        await lens.createAndAddLensFromDashboard({ title: `My lens visualization-${uuidv4()}` });

        await dashboard.waitForRenderComplete();
        await dashboard.saveDashboard(myDashboardName);
      });

      after(async () => {
        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();

        await listingTable.searchForItemWithName(myDashboardName);
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();

        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await cases.api.deleteAllCases();
      });

      it('adds lens visualization to a new case from dashboard', async () => {
        const caseTitle = 'case created from my dashboard with lens visualization';

        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();
        await dashboard.loadSavedDashboard(myDashboardName);
        await dashboardPanelActions.clickPanelAction(ADD_TO_EXISTING_CASE_DATA_TEST_SUBJ);
        await testSubjects.click('cases-table-add-case-filter-bar');

        await cases.create.createCase({
          title: caseTitle,
          description: 'test description',
          owner: 'cases',
        });
        await testSubjects.click('create-case-submit');

        await cases.common.expectToasterToContain(`Case ${caseTitle} updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

        const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
        expect(await title.getVisibleText()).toEqual(caseTitle);

        await testSubjects.existOrFail('comment-persistableState-.lens');
      });

      it('adds lens visualization to an existing case from dashboard', async () => {
        const theCaseTitle = 'case already exists!!';
        const theCase = await cases.api.createCase({
          title: theCaseTitle,
          description: 'This is a test case to verify existing action scenario!!',
          owner: 'cases',
        });

        await common.navigateToApp('dashboard');
        await dashboard.preserveCrossAppState();
        await dashboard.loadSavedDashboard(myDashboardName);

        await dashboardPanelActions.clickPanelAction(ADD_TO_EXISTING_CASE_DATA_TEST_SUBJ);

        await testSubjects.click(`cases-table-row-select-${theCase.id}`);

        await cases.common.expectToasterToContain(`Case ${theCaseTitle} updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

        const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
        expect(await title.getVisibleText()).toEqual(theCaseTitle);

        await testSubjects.existOrFail('comment-persistableState-.lens');
      });
    });
  });
};

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

const getExternalReferenceAttachment = (): ExternalReferenceAttachmentPayload => ({
  type: AttachmentType.externalReference,
  externalReferenceId: 'my-id',
  externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  owner: 'cases',
});

const getPersistableStateAttachment = (dataViewId: string): PersistableStateAttachmentPayload => ({
  type: AttachmentType.persistableState,
  persistableStateAttachmentTypeId: '.test',
  persistableStateAttachmentState: getLensState(dataViewId),
  owner: 'cases',
});
