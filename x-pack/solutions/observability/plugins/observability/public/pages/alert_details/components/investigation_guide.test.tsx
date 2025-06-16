/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InvestigationGuide } from './investigation_guide';
import { render } from '../../../utils/test_helper';
import * as hook from '../hooks/use_edit_rule_form_flyout';
import { fireEvent, waitFor } from '@testing-library/react';

describe('InvestigationGuide', () => {
  let useEditRuleFormFlyoutSpy: jest.SpyInstance;
  beforeEach(() => {
    useEditRuleFormFlyoutSpy = jest.spyOn(hook, 'useEditRuleFormFlyout');
  });
  afterEach(() => {
    useEditRuleFormFlyoutSpy.mockRestore();
  });

  it('provides an empty state that will open the rule form flyout', async () => {
    const AlertDetailsRuleFormFlyoutMock = jest.fn().mockReturnValue(<div>Test Component</div>);
    const handleEditRuleDetailsMock = jest.fn();
    useEditRuleFormFlyoutSpy.mockReturnValue({
      AlertDetailsRuleFormFlyout: AlertDetailsRuleFormFlyoutMock,
      handleEditRuleDetails: handleEditRuleDetailsMock,
    });
    const mockRule = { id: 'mock' };
    const { getByText, getByRole } = render(
      <InvestigationGuide
        onUpdate={() => {}}
        refetch={() => {}}
        // @ts-expect-error internal hook call is mocked, do not need real values
        rule={mockRule}
      />
    );

    // verify the "flyout" gets rendered
    expect(getByText('Test Component'));

    // grab add guide button for functionality testing
    const addGuideButton = getByRole('button', { name: 'Add guide' });
    expect(addGuideButton).toBeInTheDocument();

    // verify that clicking the add guide button opens the flyout
    fireEvent.click(addGuideButton);

    await waitFor(() => {
      expect(handleEditRuleDetailsMock).toHaveBeenCalledTimes(1);
    });

    expect(AlertDetailsRuleFormFlyoutMock).toHaveBeenCalledTimes(1);
    expect(AlertDetailsRuleFormFlyoutMock.mock.calls[0][0]).toEqual({
      initialEditStep: 'rule-details',
    });
  });

  it('renders the investigation guide when one is provided', async () => {
    // provide actual markdown and test it's getting rendered properly
    const mockMarkdown =
      '## This is an investigation guide\n\nCall **The team** to resolve _any issues_.\n';
    const handleEditRuleDetailsMock = jest.fn();
    useEditRuleFormFlyoutSpy.mockReturnValue({
      AlertDetailsRuleFormFlyout: jest.fn().mockReturnValue(<div>Test Component</div>),
      handleEditRuleDetails: handleEditRuleDetailsMock,
    });
    const mockRule = { id: 'mock' };

    const { getByRole } = render(
      <InvestigationGuide
        onUpdate={() => {}}
        refetch={() => {}}
        // @ts-expect-error internal hook call is mocked, do not need real values
        rule={mockRule}
        blob={mockMarkdown}
      />
    );

    // test that the component is rendering markdown
    expect(getByRole('heading', { name: 'This is an investigation guide' }));
    expect(getByRole('strong')).toHaveTextContent('The team');
    expect(getByRole('emphasis')).toHaveTextContent('any issues');
  });
});
