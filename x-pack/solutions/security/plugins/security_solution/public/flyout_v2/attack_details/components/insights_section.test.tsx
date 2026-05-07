/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { AttackDetailsContext } from '../context';
import {
  INSIGHTS_CORRELATIONS_TEST_ID,
  INSIGHTS_ENTITIES_TEST_ID,
  INSIGHTS_SECTION_TEST_ID,
} from '../constants/test_ids';
import { InsightsSection } from './insights_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage: string; id: string }) => (
    <span data-testid={id}>{defaultMessage}</span>
  ),
}));

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../flyout/attack_details/hooks/use_attack_entities_counts', () => ({
  useAttackEntitiesCounts: jest.fn().mockReturnValue({
    relatedUsers: 0,
    relatedHosts: 0,
    loading: false,
    error: false,
  }),
}));

jest.mock('../../../flyout/attack_details/hooks/use_original_alert_ids', () => ({
  useOriginalAlertIds: jest.fn().mockReturnValue(['alert-1', 'alert-2']),
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

const mockContextValue = {
  attackId: 'attack-1',
  indexName: '.alerts-default',
  getFieldsData: () => null,
  browserFields: {},
  dataFormattedForFieldBrowser: [],
  searchHit: {},
  refetch: jest.fn().mockResolvedValue(undefined),
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
  });

  it('renders the Insights section with test id', () => {
    renderWithEui(
      <InsightsSection onShowAttackEntities={jest.fn()} onShowAttackCorrelations={jest.fn()} />
    );

    expect(screen.getByTestId(INSIGHTS_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('renders Entities overview with a clickable section title link', () => {
    renderWithEui(
      <InsightsSection onShowAttackEntities={jest.fn()} onShowAttackCorrelations={jest.fn()} />
    );

    expect(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleLink`)).toBeInTheDocument();
    expect(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}LinkIcon`)).toBeInTheDocument();
  });

  it('renders Correlations overview with a clickable section title link and Related alerts count', () => {
    renderWithEui(
      <InsightsSection onShowAttackEntities={jest.fn()} onShowAttackCorrelations={jest.fn()} />
    );

    expect(screen.getByTestId(INSIGHTS_CORRELATIONS_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Correlation')).toBeInTheDocument();
    expect(screen.getByText('Related alerts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`)).toBeInTheDocument();
  });

  it('forwards onShowAttackEntities to the Entities overview title link', () => {
    const onShowAttackEntities = jest.fn();

    renderWithEui(
      <InsightsSection
        onShowAttackEntities={onShowAttackEntities}
        onShowAttackCorrelations={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId(`${INSIGHTS_ENTITIES_TEST_ID}TitleLink`));

    expect(onShowAttackEntities).toHaveBeenCalledTimes(1);
  });

  it('forwards onShowAttackCorrelations to the Correlations overview title link', () => {
    const onShowAttackCorrelations = jest.fn();

    renderWithEui(
      <InsightsSection
        onShowAttackEntities={jest.fn()}
        onShowAttackCorrelations={onShowAttackCorrelations}
      />
    );

    fireEvent.click(screen.getByTestId(`${INSIGHTS_CORRELATIONS_TEST_ID}TitleLink`));

    expect(onShowAttackCorrelations).toHaveBeenCalledTimes(1);
  });
});
