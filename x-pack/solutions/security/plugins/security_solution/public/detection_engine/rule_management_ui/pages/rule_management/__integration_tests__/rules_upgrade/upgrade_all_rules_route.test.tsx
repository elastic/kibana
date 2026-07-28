/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  PERFORM_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { usePrebuiltRulesCustomizationStatus } from '../../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { usePrebuiltRulesUpgrade } from '../../../../../rule_management/hooks/use_prebuilt_rules_upgrade';
import {
  mockKibanaFetchResponse,
  mockRuleUpgradeReviewData,
  renderRuleUpgradeContainer,
} from './test_utils/rule_upgrade_flyout';

// `renderRuleUpgradeContainer` sets edit privileges on this mock so the upgrade is allowed.
jest.mock('../../../../../../common/components/user_privileges');
jest.mock(
  '../../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status'
);

// `v2_windows_rare_metadata_user` is in `common/machine_learning/affected_job_ids.ts`; the `_ea`
// variant is not, so upgrading drops the affected job and the server raises a NON_SOLVABLE
// coverage-loss conflict. The bulk "Upgrade all" routing below is field-agnostic, but we use a
// coverage-loss rule so this doubles as the Platinum bulk Route A coverage.
const AFFECTED_JOB_ID = 'v2_windows_rare_metadata_user';
const REPLACEMENT_JOB_ID = 'v3_windows_rare_metadata_user_ea';

const PERFORM_UPGRADE_RESPONSE = {
  summary: { total: 1, succeeded: 1, skipped: 0, failed: 0 },
  results: { updated: [], skipped: [] },
  errors: [],
};

/**
 * Toggles prebuilt rule customization. Enabled = Enterprise (dry run + conflicts modal);
 * disabled = below Enterprise / Platinum (direct-to-target, Route A).
 */
const mockRulesCustomization = (enabled: boolean): void => {
  (usePrebuiltRulesCustomizationStatus as jest.Mock).mockReturnValue({
    isRulesCustomizationEnabled: enabled,
  });
};

const mockMlJobIdReviewData = (currentJobId: string, targetJobId: string): void => {
  mockRuleUpgradeReviewData({
    ruleType: 'machine_learning',
    fieldName: 'machine_learning_job_id',
    fieldVersions: {
      base: currentJobId,
      current: currentJobId,
      target: targetJobId,
      merged: currentJobId,
    },
    diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  });
};

/**
 * Renders the `usePrebuiltRulesUpgrade` hook and exposes its bulk "Upgrade all" action plus the
 * conflicts modal it owns, so the test can drive the action and assert what it does.
 */
const UpgradeAllRulesHarness = (): JSX.Element => {
  const { upgradeAllRules, upgradeConflictsModal, isFetched } = usePrebuiltRulesUpgrade({});

  return (
    <>
      {upgradeConflictsModal}
      <button
        type="button"
        disabled={!isFetched}
        data-test-subj="upgradeAllRulesTestButton"
        onClick={() => {
          upgradeAllRules();
        }}
      >
        {'Upgrade all'}
      </button>
    </>
  );
};

const performUpgradeRequests = () =>
  (KibanaServices.get().http.fetch as jest.Mock).mock.calls.filter(
    ([path, options]) => path === PERFORM_RULE_UPGRADE_URL && options?.method === 'POST'
  );

const clickUpgradeAll = async (): Promise<void> => {
  const button = await screen.findByTestId('upgradeAllRulesTestButton');
  await waitFor(() => expect(button).toBeEnabled());

  await act(async () => {
    fireEvent.click(button);
  });

  await waitFor(() => expect(performUpgradeRequests().length).toBeGreaterThan(0));
};

describe('Bulk "Upgrade all" routing with an ML coverage-loss conflict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaFetchResponse(PERFORM_RULE_UPGRADE_URL, PERFORM_UPGRADE_RESPONSE);
    // Default to Enterprise; individual blocks override as needed.
    mockRulesCustomization(true);
  });

  describe('below Enterprise (customization disabled, e.g. Platinum)', () => {
    beforeEach(() => {
      mockRulesCustomization(false);
    });

    it('upgrades all rules straight to the target version with no dry run and no conflicts modal (Route A)', async () => {
      mockMlJobIdReviewData(AFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderRuleUpgradeContainer(<UpgradeAllRulesHarness />);
      await clickUpgradeAll();

      // Exactly one perform-upgrade request, straight to TARGET, with no dry run.
      const requests = performUpgradeRequests();
      expect(requests).toHaveLength(1);

      const body = JSON.parse(requests[0][1].body);
      expect(body).toMatchObject({ mode: 'ALL_RULES', pick_version: 'TARGET' });
      expect(body).not.toHaveProperty('dry_run');
      expect(body).not.toHaveProperty('on_conflict');

      // No dry run means the conflicts modal is never shown.
      expect(screen.queryByTestId('upgradeConflictsModal')).not.toBeInTheDocument();
    });
  });

  describe('Enterprise (customization enabled)', () => {
    beforeEach(() => {
      mockRulesCustomization(true);
    });

    it('runs a dry run first instead of upgrading straight to target', async () => {
      mockMlJobIdReviewData(AFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderRuleUpgradeContainer(<UpgradeAllRulesHarness />);
      await clickUpgradeAll();

      // The first perform-upgrade request is a dry run picking the merged version.
      const [firstRequest] = performUpgradeRequests();
      const firstBody = JSON.parse(firstRequest[1].body);
      expect(firstBody).toMatchObject({
        mode: 'ALL_RULES',
        pick_version: 'MERGED',
        dry_run: true,
      });
    });
  });
});
