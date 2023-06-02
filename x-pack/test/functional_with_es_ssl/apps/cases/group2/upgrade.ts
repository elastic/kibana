/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const cases = getService('cases');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const toasts = getService('toasts');

  const updateConnector = async (id: string, req: Record<string, unknown>) => {
    const { body: connector } = await supertest
      .put(`/api/actions/connector/${id}`)
      .set('kbn-xsrf', 'true')
      .send(req)
      .expect(200);

    return connector;
  };

  const replaceNewLinesWithSpace = (str: string) => str.replace(/\n/g, ' ');

  /**
   * This test test an upgrade from 7.15 to the latest Kibana version.
   * The x-pack/test/functional/fixtures/kbn_archiver/cases/7.17.5/case.json contains a case with
   * all available user actions except user actions related to alerts. By importing the case,
   * all migrations run. We ensure that the case shows all data after migrations.
   */

  describe('Upgrade', function () {
    const CONNECTOR_ID = '92b970e0-09c4-11ed-9088-a95ba44d7455';
    const CASE_ID = 'e26361b0-09c3-11ed-9088-a95ba44d7455';

    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/cases/7.17.5/case.json'
      );

      await cases.testResources.installKibanaSampleData('logs');

      const jiraSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA)
      );

      await updateConnector(CONNECTOR_ID, {
        name: 'Jira',
        config: {
          apiUrl: jiraSimulatorURL,
          projectKey: 'ROC',
        },
        secrets: { email: 'elastic@elastic.co', apiToken: '123' },
      });

      await cases.navigation.navigateToSingleCase('cases', CASE_ID);
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/cases/7.17.5/case.json'
      );

      await cases.testResources.removeKibanaSampleData('logs');
    });

    describe('Case view page', function () {
      it('does not show any error toasters', async () => {
        expect(await toasts.getToastCount()).to.be(0);
      });

      it('shows the title correctly', async () => {
        const title = await testSubjects.find('header-page-title');
        expect(await title.getVisibleText()).equal('Upgrade test in Kibana');
      });

      it('shows the description correctly', async () => {
        const desc = await find.byCssSelector(
          '[data-test-subj="description"] [data-test-subj="scrollable-markdown"]'
        );

        expect(await desc.getVisibleText()).equal(`Testing upgrade! Let's see how it goes.`);
      });

      it('shows the edit title user action', async () => {
        await cases.singleCase.verifyUserAction(
          'title-update-action-',
          `elastic changed case name to "Upgrade test in Kibana"`
        );
      });

      it('shows the add tags user action', async () => {
        await cases.singleCase.verifyUserAction('tags-add-action-', `elastic added tags kibana`);
      });

      it('shows the remove tags user action', async () => {
        await cases.singleCase.verifyUserAction(
          'tags-delete-action-',
          `elastic removed tags cases`
        );
      });

      it('shows the first comment correctly', async () => {
        const comment = await find.byCssSelector(
          '[data-test-subj^="comment-create-action"] [data-test-subj="scrollable-markdown"]'
        );

        expect(await comment.getVisibleText()).equal(`This is interesting. I am curious also.`);
      });

      it('shows edit description user action', async () => {
        await cases.singleCase.verifyUserAction(
          'description-update-action',
          `elastic edited description`
        );
      });

      it('shows the second comment correctly', async () => {
        const comments = await find.allByCssSelector(
          '[data-test-subj^="comment-create-action"] [data-test-subj="scrollable-markdown"]'
        );
        const secondComment = comments[1];

        expect(await secondComment.getVisibleText()).equal(`Comment with a lens embeddable`);
      });

      it('shows the lens embendable', async () => {
        expect(await find.existsByCssSelector('.lnsExpressionRenderer')).eql(true);
      });

      it('shows the third comment correctly', async () => {
        const comments = await find.allByCssSelector(
          '[data-test-subj^="comment-create-action"] [data-test-subj="scrollable-markdown"]'
        );
        const thirdComment = comments[2];

        expect(await thirdComment.getVisibleText()).equal(`How did you do that?`);
      });

      it('shows edit comment user action', async () => {
        await cases.singleCase.verifyUserAction('comment-update-action', `elastic edited comment`);
      });

      it('shows in progress status user action', async () => {
        const statusesUserActions = await find.allByCssSelector(
          '[data-test-subj^="status-update-action"] .euiCommentEvent'
        );
        const inProgressUserAction = statusesUserActions[0];

        expect(replaceNewLinesWithSpace(await inProgressUserAction.getVisibleText())).contain(
          `marked case as In progress`
        );
      });

      it('shows close status user action', async () => {
        const statusesUserActions = await find.allByCssSelector(
          '[data-test-subj^="status-update-action"] .euiCommentEvent'
        );
        const closedUserAction = statusesUserActions[1];

        expect(replaceNewLinesWithSpace(await closedUserAction.getVisibleText())).contain(
          `marked case as Closed`
        );
      });

      it('shows open status user action', async () => {
        const statusesUserActions = await find.allByCssSelector(
          '[data-test-subj^="status-update-action"] .euiCommentEvent'
        );
        const openUserAction = statusesUserActions[2];

        expect(replaceNewLinesWithSpace(await openUserAction.getVisibleText())).contain(
          `marked case as Open`
        );
      });

      it('shows the selected connector user action', async () => {
        await cases.singleCase.verifyUserAction(
          'connector-update-action',
          `selected Jira as incident management system`
        );
      });

      it('shows the push to external service user action', async () => {
        await cases.singleCase.verifyUserAction(
          'pushed-push_to_service-action-a060c590-09c4-11ed-9088-a95ba44d7455',
          `pushed as new incident Jira ROC-526`
        );
      });

      it('shows the fourth comment correctly', async () => {
        const comments = await find.allByCssSelector(
          '[data-test-subj^="comment-create-action"] [data-test-subj="scrollable-markdown"]'
        );

        const thirdComment = comments[3];
        expect(await thirdComment.getVisibleText()).equal(`It was complicated but we did it!`);
      });

      it('shows the changed connector fields user action', async () => {
        await cases.singleCase.verifyUserAction(
          'connector-update-action-af80b080-09c4-11ed-9088-a95ba44d7455',
          `selected Jira as incident management system`
        );
      });

      it('shows the update incident user action', async () => {
        await cases.singleCase.verifyUserAction(
          'pushed-push_to_service-action-b1f8b560-09c4-11ed-9088-a95ba44d7455',
          `updated incident Jira ROC-526`
        );
      });

      it('shows the already pushed user action', async () => {
        const comment = await testSubjects.find('top-footer');

        expect(await comment.getVisibleText()).equal(`Already pushed to Jira incident`);
      });

      it('shows the severity correctly', async () => {
        await testSubjects.exists('case-severity-selection-low');
      });

      it('shows the status correctly', async () => {
        const severity = await testSubjects.find('case-view-status-dropdown');
        expect(await severity.getVisibleText()).equal('Open');
      });

      it('shows the refresh button', async () => {
        await testSubjects.exists('case-refresh');
      });

      it('shows the actions button', async () => {
        await testSubjects.exists('property-actions');
      });

      it('shows the reporter correctly', async () => {
        const reporter = await find.byCssSelector(
          '[data-test-subj="case-view-user-list-reporter"] [data-test-subj="user-profile-username"]'
        );

        expect(await reporter.getVisibleText()).equal('elastic');
      });

      it('shows the participants correctly', async () => {
        const participant = await find.byCssSelector(
          '[data-test-subj="case-view-user-list-participants"] [data-test-subj="user-profile-username"]'
        );

        expect(await participant.getVisibleText()).equal('elastic');
      });

      it('shows the tags correctly', async () => {
        const tags = await testSubjects.find('case-tags');
        expect(replaceNewLinesWithSpace(await tags.getVisibleText())).equal('upgrade test kibana');
      });

      it('shows the connector fields', async () => {
        await testSubjects.exists('connector-fields');
      });

      it('shows the add comment markdown', async () => {
        await testSubjects.exists('add-comment');
      });

      it('shows the change status button', async () => {
        await testSubjects.exists('case-view-status-action-button');
      });

      it('shows the add comment button', async () => {
        await testSubjects.exists('submit-comment');
      });

      it('shows the assignees section', async () => {
        await testSubjects.exists('case-view-assignees');
      });
    });
  });
};
