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
import { RuleHealthAppHeader } from './rule_health_app_header';

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

const renderHeader = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleHealthAppHeader ruleId="rule-1" />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('RuleHealthAppHeader', () => {
  it('renders the rule health title and Technical Preview badge', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Detection Engine Rule Health (rule-1)'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.badge)).toHaveTextContent(
      'Technical Preview'
    );
  });

  it('links back to the rule Overview tab', () => {
    renderHeader();

    const back = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(back).toHaveAttribute('href', '/app/security/rules/id/rule-1/overview');
    expect(back).toHaveAttribute('aria-label', 'Back to Rule details');
  });
});
