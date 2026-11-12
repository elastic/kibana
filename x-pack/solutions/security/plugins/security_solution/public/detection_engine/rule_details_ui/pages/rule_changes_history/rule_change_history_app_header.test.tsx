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
});
