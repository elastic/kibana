/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { savedRuleMock } from '../../logic/mock';
import { usePrebuiltRulesUpgrade } from '../../hooks/use_prebuilt_rules_upgrade';
import { RuleUpdateCallout } from './rule_update_callout';

jest.mock('../../hooks/use_prebuilt_rules_upgrade');

const RULE_PREVIEW_FLYOUT_TEST_ID = 'test-rule-preview-flyout';
const CONFLICTS_MODAL_TEST_ID = 'test-upgrade-conflicts-modal';

const mockUsePrebuiltRulesUpgrade = ({ total = 1 }: { total?: number } = {}) => {
  (usePrebuiltRulesUpgrade as jest.Mock).mockReturnValue({
    upgradeReviewResponse: { total },
    rulePreviewFlyout: <div data-test-subj={RULE_PREVIEW_FLYOUT_TEST_ID} />,
    upgradeConflictsModal: <div data-test-subj={CONFLICTS_MODAL_TEST_ID} />,
    openRulePreview: jest.fn(),
  });
};

describe('RuleUpdateCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout together with the conflicts modal when the rule is upgradeable', () => {
    mockUsePrebuiltRulesUpgrade();

    render(<RuleUpdateCallout rule={savedRuleMock} message="Rule update available" />, {
      wrapper: TestProviders,
    });

    // The flyout was always rendered; the conflicts modal is the one that regressed
    // (see https://github.com/elastic/kibana/issues/279791). Without it mounted,
    // confirming the conflicts upgrade hangs forever.
    expect(screen.getByTestId(RULE_PREVIEW_FLYOUT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(CONFLICTS_MODAL_TEST_ID)).toBeInTheDocument();
  });

  it('renders nothing when the rule is not upgradeable', () => {
    mockUsePrebuiltRulesUpgrade({ total: 0 });

    const { container } = render(
      <RuleUpdateCallout rule={savedRuleMock} message="Rule update available" />,
      { wrapper: TestProviders }
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId(CONFLICTS_MODAL_TEST_ID)).not.toBeInTheDocument();
  });
});
