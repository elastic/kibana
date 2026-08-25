/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InvestigationGuide } from './investigation_guide';
import { render } from '../../../utils/test_helper';
import * as kibana from '../../../utils/kibana_react';
import { act, fireEvent } from '@testing-library/react';

jest.mock('@kbn/response-ops-rule-form/flyout', () => {
  return {
    // we mock the response-ops flyout because we aren't testing it here
    RuleFormFlyout: () => <div>Mock Flyout</div>,
  };
});

describe('InvestigationGuide', () => {
  beforeEach(() => {
    jest.spyOn(kibana, 'useKibana').mockReturnValue({
      services: {
        triggersActionsUi: {
          // @ts-expect-error partial implementation for mocking
          ruleTypeRegistry: {
            get: jest.fn(),
          },
          // @ts-expect-error partial implementation for mocking
          actionTypeRegistry: {
            get: jest.fn(),
          },
        },
      },
    });
    jest.clearAllMocks();
  });

  it('provides an empty state that will open the rule form flyout', async () => {
    const mockRule = { id: 'mock' };
    const { getByRole, getByText } = render(
      <InvestigationGuide
        onUpdate={() => {}}
        refetch={() => {}}
        // @ts-expect-error internal hook call is mocked, do not need real values
        rule={mockRule}
      />
    );

    // grab add guide button for functionality testing
    const addGuideButton = getByRole('button', { name: 'Add guide' });
    expect(addGuideButton).toBeInTheDocument();

    // verify that clicking the add guide button opens the flyout
    await act(() => fireEvent.click(addGuideButton));

    expect(getByText('Mock Flyout')).toBeInTheDocument();
  });

  it('renders the investigation guide when one is provided', async () => {
    // provide actual markdown and test it's getting rendered properly
    const mockMarkdown =
      '## This is an investigation guide\n\nCall **The team** to resolve _any issues_.\n';
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
