/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const RULE_ALERT_INDEX_PATTERN = '.alerts-stack.alerts-*';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Observability Rules page', function () {
    this.tags('includeFirefox');

    const observability = getService('observability');

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await observability.alerts.common.navigateWithoutFilter();
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await esClient.deleteByQuery({
        index: RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Feature flag', () => {
      it('Link point to O11y Rules pages by default', async () => {
        const manageRulesPageHref =
          (await observability.alerts.rulesPage.getManageRulesPageHref()) ?? '';
        expect(new URL(manageRulesPageHref).pathname).equal('/app/rules');
      });
    });

    describe('User permissions', () => {
      describe('permission prompt', function () {
        this.tags('skipFIPS');
        // TODO: This test needs to be rewritten. The rules page now lives in Stack Management
        // (/app/management/insightsAndAlerting/triggersActions). Users with no management
        // sections enabled (e.g. discover-only) see "Application not found" instead of
        // noPermissionPrompt because the management app marks itself inaccessible when the
        // user has no enabled sections. A follow-up should test the prompt for a user who
        // can reach management but lacks triggersActions capabilities.
        it.skip(`shows the no permission prompt when the user has no permissions`, async () => {
          await observability.users.setTestUserRole({
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: [],
                feature: {
                  discover: ['read'],
                },
                spaces: ['*'],
              },
            ],
          });
          await observability.alerts.common.navigateToRulesPage();
          await retry.waitFor(
            'No permissions prompt',
            async () => await testSubjects.exists('noPermissionPrompt')
          );
          await observability.users.restoreDefaultTestUserRole();
        });
      });
    });
  });
};
