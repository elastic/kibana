/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PERFORM_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { savedRuleMock } from '../../../../../rule_management/logic/mock';
import { usePrebuiltRulesCustomizationStatus } from '../../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { RuleUpdateCallout } from '../../../../../rule_management/components/rule_details/rule_update_callout';
import { HAS_RULE_UPDATE_CALLOUT_BUTTON } from '../../../../../rule_management/components/rule_details/translations';
import {
  extractSingleKibanaFetchBodyBy,
  mockKibanaFetchResponse,
  mockRuleUpgradeReviewData,
  renderRuleUpgradeContainer,
} from './test_utils/rule_upgrade_flyout';

// `renderRuleUpgradeContainer` sets edit privileges on this mock so the "Update rule" button is enabled.
jest.mock('../../../../../../common/components/user_privileges');
jest.mock(
  '../../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status'
);

// `v2_windows_rare_metadata_user` is in `common/machine_learning/affected_job_ids.ts`; the `_ea`
// variant and `high_count_network_denies` are not.
const AFFECTED_JOB_ID = 'v2_windows_rare_metadata_user';
const REPLACEMENT_JOB_ID = 'v3_windows_rare_metadata_user_ea';
const UNAFFECTED_JOB_ID = 'high_count_network_denies';

const PERFORM_UPGRADE_RESPONSE = {
  summary: { total: 1, succeeded: 1, skipped: 0, failed: 0 },
  results: { updated: [], skipped: [] },
  errors: [],
};

/**
 * Toggles prebuilt rule customization. Enabled = Enterprise (three-way-diff resolver);
 * disabled = below-Enterprise (read-only diff, TARGET-only upgrades).
 */
const mockRulesCustomization = (enabled: boolean): void => {
  (usePrebuiltRulesCustomizationStatus as jest.Mock).mockReturnValue({
    isRulesCustomizationEnabled: enabled,
  });
};

/**
 * Mocks the `_review` response with a `machine_learning_job_id` field diff moving from
 * `currentJobId` to `targetJobId`.
 */
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
    // The server forces NON_SOLVABLE for the coverage-loss case; the client re-derives the
    // coverage-loss condition from the job ids regardless.
    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
  });
};

const renderCallout = () =>
  renderRuleUpgradeContainer(
    <RuleUpdateCallout
      rule={{ ...savedRuleMock, rule_id: 'test-rule' }}
      message="A newer version of this rule is available"
    />
  );

const openUpgradeFlyout = async (): Promise<void> => {
  await userEvent.click(await screen.findByText(HAS_RULE_UPDATE_CALLOUT_BUTTON));
};

const getUpdateButton = async (): Promise<HTMLElement> =>
  screen.findByTestId('updatePrebuiltRuleFromFlyoutButton');

const performUpgradeRequests = () =>
  (KibanaServices.get().http.fetch as jest.Mock).mock.calls.filter(
    ([path, options]) => path === PERFORM_RULE_UPGRADE_URL && options?.method === 'POST'
  );

describe('Rule upgrade from the Rule Details page callout with an ML coverage-loss conflict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaFetchResponse(PERFORM_RULE_UPGRADE_URL, PERFORM_UPGRADE_RESPONSE);
    // Default to Enterprise; individual blocks override as needed.
    mockRulesCustomization(true);
  });

  describe('below Enterprise (customization disabled)', () => {
    beforeEach(() => {
      mockRulesCustomization(false);
    });

    it('shows the coverage-loss warning (informational, no acknowledgment gate) and upgrades to TARGET', async () => {
      mockMlJobIdReviewData(AFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderCallout();
      await openUpgradeFlyout();

      // The coverage-loss callout is shown; it's purely informational (no acknowledgment
      // checkbox) and does not gate the upgrade.
      expect(await screen.findByTestId('mlJobCoverageLossCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('mlJobCoverageLossAcknowledgeCheckbox')).not.toBeInTheDocument();
      await waitFor(async () => expect(await getUpdateButton()).toBeEnabled());

      await act(async () => {
        fireEvent.click(await getUpdateButton());
      });

      await waitFor(() => expect(performUpgradeRequests().length).toBeGreaterThan(0));

      // The upgrade takes the target version and does not rely on `on_conflict`.
      const body = extractSingleKibanaFetchBodyBy({
        path: PERFORM_RULE_UPGRADE_URL,
        method: 'POST',
      });
      expect(body).toMatchObject({ mode: 'SPECIFIC_RULES', pick_version: 'TARGET' });
      expect(body).not.toHaveProperty('on_conflict');
    });

    it('does not show the coverage-loss warning when no affected ML job is dropped', async () => {
      mockMlJobIdReviewData(UNAFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderCallout();
      await openUpgradeFlyout();

      expect(screen.queryByTestId('mlJobCoverageLossCallout')).not.toBeInTheDocument();
      await waitFor(async () => expect(await getUpdateButton()).toBeEnabled());

      await act(async () => {
        fireEvent.click(await getUpdateButton());
      });

      await waitFor(() => expect(performUpgradeRequests().length).toBeGreaterThan(0));
    });
  });

  describe('Enterprise (customization enabled)', () => {
    beforeEach(() => {
      mockRulesCustomization(true);
    });

    it('shows the same coverage-loss warning in the resolver tab, without the acknowledgment checkbox', async () => {
      mockMlJobIdReviewData(AFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderCallout();
      await openUpgradeFlyout();

      // The callout is rendered above the three-way-diff resolver, purely informational.
      expect(await screen.findByTestId('mlJobCoverageLossCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('mlJobCoverageLossAcknowledgeCheckbox')).not.toBeInTheDocument();
    });

    it('does not show the coverage-loss warning when no affected ML job is dropped', async () => {
      mockMlJobIdReviewData(UNAFFECTED_JOB_ID, REPLACEMENT_JOB_ID);

      renderCallout();
      await openUpgradeFlyout();

      expect(screen.queryByTestId('mlJobCoverageLossCallout')).not.toBeInTheDocument();
    });
  });
});
