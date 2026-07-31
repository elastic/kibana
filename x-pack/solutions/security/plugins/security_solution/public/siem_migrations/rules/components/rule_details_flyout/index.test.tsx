/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock/test_providers';
import { MigrationRuleDetailsFlyout } from '.';
import { getRuleMigrationRuleMock } from '../../../../../common/siem_migrations/model/__mocks__';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const getMockUser = () => ({
  uid: 'user-1',
  enabled: true,
  user: {
    username: 'test_username',
    full_name: 'Test User',
  },
  data: {},
});

describe('MigrationRuleDetailsFlyout', () => {
  const closeFlyout = jest.fn();
  const defaultNavigation = {
    hasPrevious: false,
    hasNext: false,
    goToPrevious: jest.fn(),
    goToNext: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [getMockUser()],
    });
  });

  it('should render the flyout with the rule title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );
    expect(getByTestId('detailsFlyoutTitle')).toBeInTheDocument();
    expect(getByTestId('detailsFlyoutTitle')).toHaveTextContent(
      'Access - Excessive Failed Logins - Rule'
    );
  });

  it('should render the flyout with the rule "updated by" information', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );
    expect(getByTestId('updated_at')).toBeInTheDocument();
    expect(getByTestId('updated_at')).toHaveTextContent(
      'Last updated: Test User on Sep 24, 2025 @ 11:36:38.089'
    );
  });

  it('should call closeFlyout when the close button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('detailsFlyoutCloseButton'));
    expect(closeFlyout).toHaveBeenCalled();
  });

  it('should render translation tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    expect(getByTestId('tabTranslation')).toBeInTheDocument();
  });

  it('should render overview tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    expect(getByTestId('tabOverview')).toBeInTheDocument();
  });

  it('should render custom rule schedule from original rule annotations in the overview tab', async () => {
    const customRule = getRuleMigrationRuleMock({
      original_rule: {
        id: 'sentinel-rule-id',
        vendor: 'microsoft-sentinel',
        title: 'Detect port misuse by static threshold',
        description: 'Detects port usage above configured static thresholds.',
        query: 'SecurityEvent | where EventID == 1102',
        query_language: 'kql',
        annotations: {
          from: 'now-1h',
          to: 'now',
          interval: '20m',
        },
      },
      elastic_rule: {
        severity: 'medium',
        risk_score: 47,
        query: 'FROM logs-*',
        query_language: 'esql',
        description: 'Detects port usage above configured static thresholds.',
        title: 'Detect port misuse by static threshold',
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={customRule}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('tabOverview'));

    await waitFor(() => {
      expect(getByTestId('intervalPropertyValue')).toHaveTextContent('20m');
    });
    await waitFor(() => {
      expect(getByTestId('lookBackPropertyValue-40m')).toBeInTheDocument();
    });
  });

  it('should render summary tab', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    expect(getByTestId('tabSummary')).toBeInTheDocument();
  });

  it('should render close button', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={getRuleMigrationRuleMock()}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    expect(getByTestId('detailsFlyoutCloseButton')).toBeInTheDocument();
    expect(getByTestId('detailsFlyoutCloseButton')).toHaveTextContent('Close');
  });

  it('should display MITRE ATT&CK mappings in the overview tab', async () => {
    const ruleWithThreat = getRuleMigrationRuleMock({
      elastic_rule: {
        severity: 'low',
        risk_score: 21,
        query: 'FROM logs-* | WHERE event.category == "authentication"',
        description: 'Test rule for detecting successful authentication events',
        query_language: 'esql',
        title: 'QRadar Test Rule - Authentication Success',
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0001',
              name: 'Initial Access',
              reference: 'https://attack.mitre.org/tactics/TA0001',
            },
            technique: [
              {
                id: 'T1078',
                name: 'Valid Accounts',
                reference: 'https://attack.mitre.org/techniques/T1078',
                subtechnique: [],
              },
            ],
          },
        ],
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <MigrationRuleDetailsFlyout
          migrationRule={ruleWithThreat}
          closeFlyout={closeFlyout}
          navigation={defaultNavigation}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('tabOverview'));

    await waitFor(() => {
      expect(getByTestId('threatPropertyTitle')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(getByTestId('threatTacticLink')).toHaveTextContent(/Initial Access/);
    });
    await waitFor(() => {
      expect(getByTestId('threatTechniqueLink')).toHaveTextContent(/Valid Accounts/);
    });
  });

  describe('rule navigation', () => {
    const getNavigation = (overrides = {}) => ({
      hasPrevious: true,
      hasNext: true,
      goToPrevious: jest.fn(),
      goToNext: jest.fn(),
      ...overrides,
    });

    it('should let the user move to the previous rule', () => {
      const navigation = getNavigation();
      const { getByTestId } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={navigation}
          />
        </TestProviders>
      );
      fireEvent.click(getByTestId('migrationFlyoutPreviousButton'));
      expect(navigation.goToPrevious).toHaveBeenCalled();
    });

    it('should let the user move to the next rule', () => {
      const navigation = getNavigation();
      const { getByTestId } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={navigation}
          />
        </TestProviders>
      );
      fireEvent.click(getByTestId('migrationFlyoutNextButton'));
      expect(navigation.goToNext).toHaveBeenCalled();
    });

    it('should prevent moving backward from the first rule of the page', () => {
      const navigation = getNavigation({ hasPrevious: false });
      const { getByTestId } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={navigation}
          />
        </TestProviders>
      );
      expect(getByTestId('migrationFlyoutPreviousButton')).toBeDisabled();
    });

    it('should prevent moving forward from the last rule of the page', () => {
      const navigation = getNavigation({ hasNext: false });
      const { getByTestId } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={navigation}
          />
        </TestProviders>
      );
      expect(getByTestId('migrationFlyoutNextButton')).toBeDisabled();
    });

    it('should disable both arrows when the page has a single rule', () => {
      const navigation = getNavigation({ hasPrevious: false, hasNext: false });
      const { getByTestId } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={navigation}
          />
        </TestProviders>
      );
      expect(getByTestId('migrationFlyoutPreviousButton')).toBeDisabled();
      expect(getByTestId('migrationFlyoutNextButton')).toBeDisabled();
    });
  });

  describe('fresh-load behavior on rule change', () => {
    const bothWaysNavigation = {
      hasPrevious: true,
      hasNext: true,
      goToPrevious: jest.fn(),
      goToNext: jest.fn(),
    };

    it('should focus the first enabled tab when a different rule is shown', () => {
      const { getByTestId, rerender } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('tabSummary'));
      expect(getByTestId('tabSummary')).toHaveAttribute('aria-selected', 'true');

      rerender(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock({ id: 'other-rule-id' })}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      expect(getByTestId('tabTranslation')).toHaveAttribute('aria-selected', 'true');
      expect(getByTestId('tabSummary')).toHaveAttribute('aria-selected', 'false');
    });

    it('should not leave a disabled tab selected when the shown rule cannot display it', () => {
      const { getByTestId, rerender } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('tabOverview'));
      expect(getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'true');

      rerender(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock({
              id: 'other-rule-id',
              translation_result: 'untranslatable',
              elastic_rule: undefined,
            })}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      expect(getByTestId('tabOverview')).toBeDisabled();
      expect(getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'false');
      expect(getByTestId('tabTranslation')).toHaveAttribute('aria-selected', 'true');
    });

    it('should keep the selected tab when the same rule re-renders', () => {
      const { getByTestId, rerender } = render(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      fireEvent.click(getByTestId('tabSummary'));
      expect(getByTestId('tabSummary')).toHaveAttribute('aria-selected', 'true');

      rerender(
        <TestProviders>
          <MigrationRuleDetailsFlyout
            migrationRule={getRuleMigrationRuleMock()}
            closeFlyout={closeFlyout}
            navigation={bothWaysNavigation}
          />
        </TestProviders>
      );

      expect(getByTestId('tabSummary')).toHaveAttribute('aria-selected', 'true');
    });
  });
});
