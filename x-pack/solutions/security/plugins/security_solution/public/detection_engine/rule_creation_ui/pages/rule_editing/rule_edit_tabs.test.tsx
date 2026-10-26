/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
import { RuleStep } from '../../../common/types';
import type { RuleEditTab } from './rule_edit_tabs';
import { RuleEditTabs } from './rule_edit_tabs';

const UPSELLING_MESSAGE = 'Without the Enterprise subscription you cannot customize prebuilt rules';

const createTabs = (tooltip?: string): RuleEditTab[] => [
  {
    id: RuleStep.defineRule,
    name: 'Definition',
    disabled: tooltip !== undefined,
    tooltip,
    'data-test-subj': 'edit-rule-define-tab',
  },
  {
    id: RuleStep.aboutRule,
    name: 'About',
    disabled: tooltip !== undefined,
    tooltip,
    'data-test-subj': 'edit-rule-about-tab',
  },
  {
    id: RuleStep.scheduleRule,
    name: 'Schedule',
    disabled: tooltip !== undefined,
    tooltip,
    'data-test-subj': 'edit-rule-schedule-tab',
  },
  {
    id: RuleStep.ruleActions,
    name: 'Actions',
    'data-test-subj': 'edit-rule-actions-tab',
  },
];

describe('RuleEditTabs', () => {
  it.each([
    ['without tooltips', undefined],
    ['with tooltips', UPSELLING_MESSAGE],
  ])('renders every tab as a direct child of a single tablist %s', (_, tooltip) => {
    render(
      <RuleEditTabs
        tabs={createTabs(tooltip)}
        activeStep={RuleStep.defineRule}
        onTabClick={jest.fn()}
      />
    );

    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    tabs.forEach((tab) => expect(tab.parentElement).toBe(tablist));
  });

  it('does not add extra focus stops inside tabs without a tooltip', () => {
    render(
      <RuleEditTabs tabs={createTabs()} activeStep={RuleStep.defineRule} onTabClick={jest.fn()} />
    );

    screen
      .getAllByRole('tab')
      .forEach((tab) => expect(tab.querySelectorAll('[tabindex]')).toHaveLength(0));
  });

  it('shows the tooltip of a disabled tab when its label receives keyboard focus', () => {
    render(
      <RuleEditTabs
        tabs={createTabs(UPSELLING_MESSAGE)}
        activeStep={RuleStep.ruleActions}
        onTabClick={jest.fn()}
      />
    );

    const defineTab = screen.getByTestId('edit-rule-define-tab');
    expect(defineTab).toBeDisabled();

    const label = within(defineTab).getByText('Definition');
    expect(label).toHaveAttribute('tabindex', '0');

    const restoreFocus = focusEuiToolTipTrigger(label);
    expect(screen.getByRole('tooltip')).toHaveTextContent(UPSELLING_MESSAGE);
    restoreFocus();
  });

  it('calls onTabClick with the step of the clicked tab', () => {
    const onTabClick = jest.fn();
    render(
      <RuleEditTabs tabs={createTabs()} activeStep={RuleStep.defineRule} onTabClick={onTabClick} />
    );

    fireEvent.click(screen.getByTestId('edit-rule-schedule-tab'));

    expect(onTabClick).toHaveBeenCalledWith(RuleStep.scheduleRule);
  });
});
