/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { TestProviders } from '../../../../common/mock';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { RuleChangeHistoryAppHeader } from './rule_change_history_app_header';
import { useRuleAuthorDisplayNames } from '../../../rule_management/logic/use_rule_author_display_names';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl:
    () =>
    ({ path = '' }: { path?: string }) =>
      `/app/security/rules${path}`,
}));
jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));
jest.mock('../../../rule_management/logic/use_rule_author_display_names', () => ({
  useRuleAuthorDisplayNames: jest.fn(),
}));

const rule = {
  ...mockRule('rule-id'),
  name: 'My detection rule',
  created_by: 'analyst',
  updated_by: 'other analyst',
};

const renderHeader = (
  props: Partial<React.ComponentProps<typeof RuleChangeHistoryAppHeader>> = {}
) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleChangeHistoryAppHeader ruleId="rule-id" rule={rule} {...props} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('RuleChangeHistoryAppHeader', () => {
  beforeEach(() => {
    (useRuleAuthorDisplayNames as jest.Mock).mockImplementation(({ createdBy, updatedBy }) => ({
      createdBy,
      updatedBy,
    }));
  });

  it('renders the rule name and links back to the rule Overview tab', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'My detection rule'
    );
    const back = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(back).toHaveAttribute('href', '/app/security/rules/id/rule-id/overview');
    expect(back).toHaveAttribute('aria-label', 'Back to Rule details');
  });

  it('renders a stable title while the rule is loading', () => {
    renderHeader({ rule: null });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Rule changes history'
    );
  });

  it('renders execution status and created and updated metadata', () => {
    renderHeader();

    expect(screen.getByTestId('ruleStatus')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDetailsCreatedBy')).toHaveTextContent('Created by analyst');
    expect(screen.getByTestId('ruleDetailsUpdatedBy')).toHaveTextContent(
      'Updated by other analyst'
    );
  });

  it('renders resolved author display names when the rule has profile UIDs', () => {
    const ruleWithProfileUids = {
      ...rule,
      created_by: '1234567890',
      created_by_profile_uid: 'created-uid',
      updated_by: '0987654321',
      updated_by_profile_uid: 'updated-uid',
    };
    (useRuleAuthorDisplayNames as jest.Mock).mockReturnValue({
      createdBy: 'Rule Creator',
      updatedBy: 'Rule Updater',
    });
    renderHeader({ rule: ruleWithProfileUids });

    expect(useRuleAuthorDisplayNames).toHaveBeenCalledWith({
      createdBy: '1234567890',
      createdByProfileUid: 'created-uid',
      updatedBy: '0987654321',
      updatedByProfileUid: 'updated-uid',
    });
    expect(screen.getByTestId('ruleDetailsCreatedBy')).toHaveTextContent('Created by Rule Creator');
    expect(screen.getByTestId('ruleDetailsUpdatedBy')).toHaveTextContent('Updated by Rule Updater');
  });
});
