/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const REPO_NAME = 'test';
const POLICY_NAME = 'ilm-a11y-test';
const POLICY_ALL_PHASES = {
  policy: {
    phases: {
      hot: {
        actions: {},
      },
      warm: {
        actions: {},
      },
      cold: {
        actions: {},
      },
      frozen: {
        actions: {
          searchable_snapshot: {
            snapshot_repository: REPO_NAME,
          },
        },
      },
      delete: {
        actions: {},
      },
    },
  },
};

const indexTemplateName = 'ilm-a11y-test-template';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, indexLifecycleManagement } = getPageObjects([
    'common',
    'indexLifecycleManagement',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esClient = getService('es');
  const a11y = getService('a11y');

  const filterByPolicyName = async (policyName: string) => {
    await testSubjects.setValue('ilmSearchBar', policyName);
  };

  const findPolicyLinkInListView = async (policyName: string) => {
    await filterByPolicyName(policyName);
    const links = await testSubjects.findAll('policyTablePolicyNameLink');
    for (const link of links) {
      const name = await link.getVisibleText();
      if (name === policyName) {
        return link;
      }
    }
    throw new Error(`Could not find ${policyName} in policy table`);
  };

  describe('Index Lifecycle Management', async () => {
    before(async () => {
      await esClient.snapshot.createRepository({
        name: REPO_NAME,
        body: {
          type: 'fs',
          settings: {
            // use one of the values defined in path.repo in test/functional/config.js
            location: '/tmp/',
          },
        },
        verify: false,
      });
      await esClient.ilm.putLifecycle({ name: POLICY_NAME, body: POLICY_ALL_PHASES });
      await esClient.indices.putIndexTemplate({
        name: indexTemplateName,
        body: {
          template: {
            settings: {
              lifecycle: {
                name: POLICY_NAME,
              },
            },
          },
          index_patterns: ['test*'],
        },
      });
    });

    after(async () => {
      await esClient.snapshot.deleteRepository({
        name: REPO_NAME,
      });
      await esClient.ilm.deleteLifecycle({ name: POLICY_NAME });
      await esClient.indices.deleteIndexTemplate({ name: indexTemplateName });
    });

    beforeEach(async () => {
      await retry.waitFor('ILM app', async () => {
        await common.navigateToApp('indexLifecycleManagement');
        return testSubjects.exists('ilmPageHeader');
      });
    });

    describe('Edit policy form', () => {
      it('Create policy', async () => {
        const createButtonTestSubject = 'createPolicyButton';
        await retry.waitFor('ILM create policy button', async () => {
          return testSubjects.isDisplayed(createButtonTestSubject);
        });

        // Navigate to create policy page and take snapshot
        await testSubjects.click(createButtonTestSubject);
        await retry.waitFor('ILM create policy form', async () => {
          return (await testSubjects.getVisibleText('policyTitle')) === 'Create policy';
        });

        // Fill out form after enabling all phases and take snapshot.
        await indexLifecycleManagement.fillNewPolicyForm({
          policyName: 'testPolicy',
          warmEnabled: true,
          coldEnabled: true,
          frozenEnabled: true,
          deleteEnabled: true,
        });
        await a11y.testAppSnapshot();
      });

      it('Edit policy', async () => {
        const link = await findPolicyLinkInListView(POLICY_NAME);
        await link.click();
        await retry.waitFor('ILM edit form', async () => {
          return (
            (await testSubjects.getVisibleText('policyTitle')) === `Edit policy ${POLICY_NAME}`
          );
        });
        await a11y.testAppSnapshot();
      });

      it('Request flyout', async () => {
        const link = await findPolicyLinkInListView(POLICY_NAME);
        await link.click();
        await retry.waitFor('ILM request button', async () => {
          return testSubjects.exists('requestButton');
        });
        // Take snapshot of the show request panel
        await testSubjects.click('requestButton');
        await a11y.testAppSnapshot();
      });
    });

    describe('Policies list', () => {
      it('List policies view', async () => {
        await a11y.testAppSnapshot();
      });
    });

    it('Add policy to index template modal', async () => {
      await filterByPolicyName(POLICY_NAME);
      const policyRow = await testSubjects.find(`policyTableRow-${POLICY_NAME}`);
      const addPolicyButton = await policyRow.findByTestSubject('addPolicyToTemplate');

      await addPolicyButton.click();

      await retry.waitFor('ILM add policy to index template modal to be present', async () => {
        return testSubjects.isDisplayed('addPolicyToTemplateModal');
      });

      await a11y.testAppSnapshot();
    });

    it('Delete policy modal', async () => {
      await filterByPolicyName(POLICY_NAME);
      const policyRow = await testSubjects.find(`policyTableRow-${POLICY_NAME}`);
      const deleteButton = await policyRow.findByTestSubject('deletePolicy');

      await deleteButton.click();

      await retry.waitFor('ILM delete policy modal to be present', async () => {
        return testSubjects.isDisplayed('deletePolicyModal');
      });

      await a11y.testAppSnapshot();
    });

    it('Index templates flyout', async () => {
      await filterByPolicyName(POLICY_NAME);
      const policyRow = await testSubjects.find(`policyTableRow-${POLICY_NAME}`);
      const actionsButton = await policyRow.findByTestSubject('viewIndexTemplates');

      await actionsButton.click();

      const flyoutTitleSelector = 'indexTemplatesFlyoutHeader';
      await retry.waitFor('Index templates flyout', async () => {
        return testSubjects.isDisplayed(flyoutTitleSelector);
      });

      await a11y.testAppSnapshot();
    });
  });
}
