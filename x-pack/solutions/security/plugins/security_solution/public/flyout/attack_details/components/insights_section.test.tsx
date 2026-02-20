/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { AttackDetailsContext } from '../context';
import { INSIGHTS_ENTITIES_TEST_ID } from '../constants/test_ids';
import { InsightsSection } from './insights_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('../hooks/use_attack_entities_counts', () => ({
  useAttackEntitiesCounts: jest.fn().mockReturnValue({
    relatedUsers: 0,
    relatedHosts: 0,
    loading: false,
    error: false,
  }),
}));

jest.mock('../../shared/components/expandable_section', () => ({
  ExpandableSection: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj'?: string;
  }) => <section data-test-subj={dataTestSubj}>{children}</section>,
}));

const mockOpenLeftPanel = jest.fn();

const mockContextValue = {
  attackId: 'attack-1',
  indexName: '.alerts-default',
  getFieldsData: () => null,
  browserFields: {},
  dataFormattedForFieldBrowser: [],
  searchHit: {},
};

const renderWithEui = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <AttackDetailsContext.Provider
        value={
          mockContextValue as unknown as React.ComponentProps<
            typeof AttackDetailsContext.Provider
          >['value']
        }
      >
        {ui}
      </AttackDetailsContext.Provider>
    </EuiProvider>
  );

describe('InsightsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandSection).mockReturnValue(true);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      openLeftPanel: mockOpenLeftPanel,
      openFlyout: jest.fn(),
      openRightPanel: jest.fn(),
      openPreviewPanel: jest.fn(),
      closeRightPanel: jest.fn(),
      closePreviewPanel: jest.fn(),
      closeFlyout: jest.fn(),
      closeLeftPanel: jest.fn(),
    } as unknown as ReturnType<typeof useExpandableFlyoutApi>);
  });

  it('renders the Insights section with test id', () => {
    renderWithEui(<InsightsSection />);

    expect(
      screen.getByTestId('attack-details-flyout-overview-insights-section')
    ).toBeInTheDocument();
  });

  it('renders Entities overview with link that opens left panel on click', async () => {
    const user = userEvent.setup();
    renderWithEui(<InsightsSection />);

    const titleLink = screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleLink`);
    expect(titleLink).toBeInTheDocument();

    await user.click(titleLink);

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: 'attack-details-left',
      params: { attackId: 'attack-1', indexName: '.alerts-default' },
      path: { tab: 'insights' },
    });
  });
});
