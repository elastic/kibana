/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

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
            snapshot_repository: 'test',
          },
        },
      },
      delete: {
        actions: {},
      },
    },
  },
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, indexLifecycleManagement } = getPageObjects([
    'common',
    'indexLifecycleManagement',
  ]);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const esClient = getService('es');
  const a11y = getService('a11y');

  const findPolicyLinkInListView = async (policyName: string) => {
    const links = await testSubjects.findAll('policyTablePolicyNameLink');
    for (const link of links) {
      const name = await link.getVisibleText();
      if (name === policyName) {
        return link;
      }
    }
    throw new Error(`Could not find ${policyName} in policy table`);
  };

  const clickPolicyActionsButton = async (policyName: string) => {
    const actionsCell = await testSubjects.find(`policyTableCell-actions-${policyName}`);
    const actionsButton = await actionsCell.findByTestSubject('policyActionsContextMenuButton');

    await actionsButton.click();
  };

  describe('Index Lifecycle Management', async () => {
    before(async () => {
      await esClient.ilm.putLifecycle({ policy: POLICY_NAME, body: POLICY_ALL_PHASES });
    });

    after(async () => {
      // @ts-expect-error @elastic/elasticsearch DeleteSnapshotLifecycleRequest.policy_id is required
      await esClient.ilm.deleteLifecycle({ policy: POLICY_NAME });
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
      await clickPolicyActionsButton(POLICY_NAME);

      const buttonSelector = 'addPolicyToTemplate';

      await retry.waitFor('ILM add policy to index template button', async () => {
        return testSubjects.isDisplayed(buttonSelector);
      });
      await testSubjects.click(buttonSelector);

      await retry.waitFor('ILM add policy to index template modal to be present', async () => {
        return testSubjects.isDisplayed('confirmModalTitleText');
      });

      await a11y.testAppSnapshot();
    });

    it('Delete policy modal', async () => {
      await clickPolicyActionsButton(POLICY_NAME);

      const buttonSelector = 'deletePolicy';

      await retry.waitFor('ILM delete policy button', async () => {
        return testSubjects.isDisplayed(buttonSelector);
      });
      await testSubjects.click(buttonSelector);

      await retry.waitFor('ILM delete policy modal to be present', async () => {
        return testSubjects.isDisplayed('confirmModalTitleText');
      });

      await a11y.testAppSnapshot();
    });
  });
}
