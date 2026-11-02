/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { InsightsSection } from './insights_section';
import { INSIGHTS_SECTION_TEST_ID } from '../constants/test_ids';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { EntitiesOverview } from './entities_overview';
import { CorrelationsOverview } from './correlations_overview';

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

jest.mock('../../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../shared/components/expandable_section', () => ({
  ExpandableSection: ({
    title,
    children,
    'data-test-subj': dataTestSubj,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
    'data-test-subj'?: string;
  }) => (
    <section data-test-subj={dataTestSubj}>
      <div>{title}</div>
      {children}
    </section>
  ),
}));

jest.mock('./entities_overview', () => ({
  EntitiesOverview: jest.fn(() => <div data-test-subj="entities-overview" />),
}));

jest.mock('./correlations_overview', () => ({
  CorrelationsOverview: jest.fn(() => <div data-test-subj="correlations-overview" />),
}));

const mockedUseExpandSection = jest.mocked(useExpandSection);
const mockedEntitiesOverview = jest.mocked(EntitiesOverview);
const mockedCorrelationsOverview = jest.mocked(CorrelationsOverview);

const buildHit = (alertIds: string[]): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-id' },
    flattened: {
      'kibana.alert.attack_discovery.alert_ids': alertIds,
    },
  } as unknown as DataTableRecord);

const renderSection = (hit: DataTableRecord) =>
  render(<InsightsSection hit={hit} onShowEntities={jest.fn()} onShowCorrelations={jest.fn()} />);

describe('InsightsSection (v2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseExpandSection.mockReturnValue(true);
  });

  it('renders the insights section with the correct test id', () => {
    renderSection(buildHit(['a', 'b']));

    expect(screen.getByTestId(INSIGHTS_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('renders the section title', () => {
    renderSection(buildHit(['a', 'b']));

    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('renders EntitiesOverview and CorrelationsOverview', () => {
    renderSection(buildHit(['a', 'b']));

    expect(screen.getByTestId('entities-overview')).toBeInTheDocument();
    expect(screen.getByTestId('correlations-overview')).toBeInTheDocument();
  });

  it('calls useExpandSection with default collapsed', () => {
    renderSection(buildHit(['a', 'b']));

    expect(mockedUseExpandSection).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'insights', defaultValue: false })
    );
  });

  it('forwards onShowEntities to EntitiesOverview', () => {
    const onShowEntities = jest.fn();
    render(
      <InsightsSection
        hit={buildHit(['a'])}
        onShowEntities={onShowEntities}
        onShowCorrelations={jest.fn()}
      />
    );

    expect(mockedEntitiesOverview).toHaveBeenCalledWith(
      expect.objectContaining({ onShowEntities }),
      expect.anything()
    );
  });

  it('forwards onShowCorrelations to CorrelationsOverview', () => {
    const onShowCorrelations = jest.fn();
    render(
      <InsightsSection
        hit={buildHit(['a'])}
        onShowEntities={jest.fn()}
        onShowCorrelations={onShowCorrelations}
      />
    );

    expect(mockedCorrelationsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ onShowCorrelations }),
      expect.anything()
    );
  });
});
