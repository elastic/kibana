/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewInvalidMitreRulesCallout } from './invalid_mitre_rules_callout';
import type { CoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/dashboard';

const emptyInvalidlyMappedRules: CoverageOverviewDashboard['invalidlyMappedRules'] = {
  enabledRules: [],
  disabledRules: [],
};

const renderCallout = (
  props: React.ComponentProps<typeof CoverageOverviewInvalidMitreRulesCallout>
) =>
  render(
    <TestProviders>
      <CoverageOverviewInvalidMitreRulesCallout {...props} />
    </TestProviders>
  );

describe('CoverageOverviewInvalidMitreRulesCallout', () => {
  it('renders nothing when there are no invalidly mapped rules', () => {
    const { container } = renderCallout({ invalidlyMappedRules: emptyInvalidlyMappedRules });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the callout with singular description when there is one invalid rule', () => {
    renderCallout({
      invalidlyMappedRules: {
        enabledRules: [{ id: 'rule-1', name: 'Enabled rule', invalidMitreIds: ['TA9999'] }],
        disabledRules: [],
      },
    });

    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesCallout')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You have 1 rule that references MITRE ATT&CK® IDs not present in the currently supported version. They may not appear correctly in the coverage matrix.',
        { exact: false }
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesViewButton')).toBeInTheDocument();
    expect(screen.queryByTestId('coverageOverviewInvalidMitreRulesModal')).not.toBeInTheDocument();
  });

  it('uses plural description when there are multiple invalid rules', () => {
    renderCallout({
      invalidlyMappedRules: {
        enabledRules: [{ id: 'rule-1', name: 'Enabled rule', invalidMitreIds: ['TA9999'] }],
        disabledRules: [{ id: 'rule-2', name: 'Disabled rule', invalidMitreIds: ['T9999'] }],
      },
    });

    expect(
      screen.getByText(
        'You have 2 rules that reference MITRE ATT&CK® IDs not present in the currently supported version. They may not appear correctly in the coverage matrix.',
        { exact: false }
      )
    ).toBeInTheDocument();
  });

  it('opens the modal with all invalid rules grouped by status', async () => {
    const user = userEvent.setup();

    renderCallout({
      invalidlyMappedRules: {
        enabledRules: [
          {
            id: 'rule-enabled',
            name: 'Enabled rule with bad MITRE',
            invalidMitreIds: ['TA9999', 'T9999'],
          },
        ],
        disabledRules: [
          {
            id: 'rule-disabled',
            name: 'Disabled rule with bad MITRE',
            invalidMitreIds: ['T1234.999'],
          },
        ],
      },
    });

    await user.click(screen.getByTestId('coverageOverviewInvalidMitreRulesViewButton'));

    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesModal')).toBeInTheDocument();
    expect(screen.getByText('Enabled rule with bad MITRE')).toBeInTheDocument();
    expect(screen.getByText('Disabled rule with bad MITRE')).toBeInTheDocument();
    expect(screen.getByText('TA9999')).toBeInTheDocument();
    expect(screen.getByText('T9999')).toBeInTheDocument();
    expect(screen.getByText('T1234.999')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enabled rules' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disabled rules' })).toBeInTheDocument();
  });

  it('renders a flat list (no section headers) when only one group has rules', async () => {
    const user = userEvent.setup();

    renderCallout({
      invalidlyMappedRules: {
        enabledRules: [
          { id: 'rule-enabled-only', name: 'Enabled rule', invalidMitreIds: ['TA9999'] },
        ],
        disabledRules: [],
      },
    });

    await user.click(screen.getByTestId('coverageOverviewInvalidMitreRulesViewButton'));

    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesModal')).toBeInTheDocument();
    expect(screen.getByText('Enabled rule')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Enabled rules' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Disabled rules' })).not.toBeInTheDocument();
  });

  it('closes the modal via the close button', async () => {
    const user = userEvent.setup();

    renderCallout({
      invalidlyMappedRules: {
        enabledRules: [{ id: 'rule-1', name: 'Some rule', invalidMitreIds: ['TA9999'] }],
        disabledRules: [],
      },
    });

    await user.click(screen.getByTestId('coverageOverviewInvalidMitreRulesViewButton'));
    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesModal')).toBeInTheDocument();

    await user.click(screen.getByTestId('coverageOverviewInvalidMitreRulesModalCloseButton'));
    expect(screen.queryByTestId('coverageOverviewInvalidMitreRulesModal')).not.toBeInTheDocument();
  });
});
