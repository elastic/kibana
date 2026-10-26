/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { EntitySummaryGrid } from './entity_summary_grid';
import { mockEntityRecord } from '../../mocks';
import type { Entity } from '../../../../../common/api/entity_analytics';

jest.mock('../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [
      { id: 'watchlist-1', name: 'First Watchlist' },
      { id: 'watchlist-2', name: 'Second Watchlist' },
    ],
  }),
}));

const entityWithSource: Entity = {
  ...mockEntityRecord,
  entity: {
    ...mockEntityRecord.entity,
    source: ['logs-endpoint'],
  },
} as Entity;

const entityWithWatchlists = {
  ...entityWithSource,
  entity: {
    ...entityWithSource.entity,
    attributes: {
      watchlists: ['watchlist-1', 'watchlist-2'],
    },
  },
} as unknown as Entity;

const entityWithMultipleSources = {
  ...mockEntityRecord,
  entity: {
    ...mockEntityRecord.entity,
    source: ['okta', 'entityanalytics_okta'],
  },
} as unknown as Entity;

describe('EntitySummaryGrid', () => {
  it('renders four panels', () => {
    const { getByText } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithSource} criticalityLevel="high_impact" />
      </TestProviders>
    );

    expect(getByText('Entity ID')).toBeInTheDocument();
    expect(getByText('Data source')).toBeInTheDocument();
    expect(getByText('Asset criticality')).toBeInTheDocument();
    expect(getByText('Watchlists')).toBeInTheDocument();
  });

  it('displays entity id', () => {
    const { getByText, queryByTestId } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithSource} />
      </TestProviders>
    );

    expect(getByText('test-entity-id-host-abc123')).toBeInTheDocument();
    expect(queryByTestId('entityIdCell-more')).not.toBeInTheDocument();
  });

  it('displays data source formatted (capitalized, separators replaced with spaces)', () => {
    const { getByText, queryByText } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithSource} />
      </TestProviders>
    );

    expect(getByText('Logs Endpoint')).toBeInTheDocument();
    expect(queryByText('logs-endpoint')).not.toBeInTheDocument();
  });

  it('displays first data source inline and a "+N" overflow badge when entity.source is an array', () => {
    const { getByText, queryByText, getByTestId } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithMultipleSources} />
      </TestProviders>
    );

    expect(getByText('Okta')).toBeInTheDocument();
    expect(queryByText('okta')).not.toBeInTheDocument();
    expect(queryByText('entityanalytics_okta')).not.toBeInTheDocument();
    expect(getByTestId('entitySourceValue-more')).toHaveTextContent('+1');
  });

  it('renders asset criticality badge', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithSource} criticalityLevel="high_impact" />
      </TestProviders>
    );

    expect(getByTestId('asset-criticality-badge')).toBeInTheDocument();
  });

  it('shows arrow down icon when onCriticalitySave is provided', () => {
    const { container } = render(
      <TestProviders>
        <EntitySummaryGrid
          entityRecord={entityWithSource}
          criticalityLevel="high_impact"
          onCriticalitySave={jest.fn()}
        />
      </TestProviders>
    );

    expect(container.querySelector('[data-euiicon-type="chevronSingleDown"]')).toBeInTheDocument();
  });

  it('does not show arrow down icon when onCriticalitySave is not provided', () => {
    const { container } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithSource} criticalityLevel="high_impact" />
      </TestProviders>
    );

    expect(
      container.querySelector('[data-euiicon-type="chevronSingleDown"]')
    ).not.toBeInTheDocument();
  });

  it('opens criticality modal on click', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntitySummaryGrid
          entityRecord={entityWithSource}
          criticalityLevel="high_impact"
          onCriticalitySave={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('asset-criticality-badge'));

    expect(getByTestId('asset-criticality-modal-title')).toBeInTheDocument();
  });

  it('displays first watchlist name', () => {
    const { getByText } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithWatchlists} />
      </TestProviders>
    );

    expect(getByText('First Watchlist')).toBeInTheDocument();
  });

  it('displays a +N overflow badge for additional watchlists', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntitySummaryGrid entityRecord={entityWithWatchlists} />
      </TestProviders>
    );

    expect(getByTestId('entityWatchlistsCell-more')).toHaveTextContent('+1');
  });

  describe('group view (aliasRecords supplied)', () => {
    const target = {
      ...entityWithSource,
      asset: { criticality: 'low_impact' },
      entity: { ...entityWithSource.entity, attributes: { watchlists: ['watchlist-1'] } },
    } as unknown as Entity;
    const alias = {
      ...entityWithSource,
      asset: { criticality: 'extreme_impact' },
      entity: {
        ...entityWithSource.entity,
        id: 'alias-id',
        attributes: { watchlists: ['watchlist-2', 'watchlist-1'] },
      },
    } as unknown as Entity;

    it('shows the primary record entity id inline with the alias ids behind a +N badge', () => {
      const secondAlias = {
        ...alias,
        entity: { ...alias.entity, id: 'second-alias-id' },
      } as unknown as Entity;
      const { getByText, queryByText, getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid entityRecord={target} aliasRecords={[alias, secondAlias]} />
        </TestProviders>
      );

      expect(getByText('test-entity-id-host-abc123')).toBeInTheDocument();
      expect(queryByText('alias-id')).not.toBeInTheDocument();
      expect(getByTestId('entityIdCell-more')).toHaveTextContent('+2');
    });

    it('lists the alias ids in the badge tooltip', async () => {
      const { getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid entityRecord={target} aliasRecords={[alias]} />
        </TestProviders>
      );

      fireEvent.mouseOver(getByTestId('entityIdCell-more'));

      await waitFor(() => {
        expect(screen.getByText('alias-id')).toBeInTheDocument();
      });
      expect(screen.getByText('Additional entity IDs')).toBeInTheDocument();
    });

    it('counts each alias id once and never counts the target itself', () => {
      const duplicateAlias = { ...alias } as unknown as Entity;
      const targetLookalike = {
        ...alias,
        entity: { ...alias.entity, id: target.entity?.id },
      } as unknown as Entity;
      const { getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid
            entityRecord={target}
            aliasRecords={[alias, duplicateAlias, targetLookalike]}
          />
        </TestProviders>
      );

      expect(getByTestId('entityIdCell-more')).toHaveTextContent('+1');
    });

    it('shows the most severe criticality across the group, ignoring criticalityLevel', () => {
      const { getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid
            entityRecord={target}
            aliasRecords={[alias]}
            criticalityLevel="medium_impact"
          />
        </TestProviders>
      );

      expect(getByTestId('asset-criticality-badge')).toHaveTextContent('Extreme Impact');
    });

    it('is read-only even when onCriticalitySave is provided', () => {
      const onCriticalitySave = jest.fn();
      const { container, getByTestId, queryByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid
            entityRecord={target}
            aliasRecords={[alias]}
            onCriticalitySave={onCriticalitySave}
          />
        </TestProviders>
      );

      expect(
        container.querySelector('[data-euiicon-type="chevronSingleDown"]')
      ).not.toBeInTheDocument();

      fireEvent.click(getByTestId('asset-criticality-badge'));

      expect(queryByTestId('asset-criticality-modal-title')).not.toBeInTheDocument();
      expect(onCriticalitySave).not.toHaveBeenCalled();
    });

    it('shows the union of data sources across the group', () => {
      const aliasWithOtherSource = {
        ...alias,
        entity: { ...alias.entity, source: ['logs-endpoint', 'entityanalytics_okta'] },
      } as unknown as Entity;

      const { getByText, getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid entityRecord={target} aliasRecords={[aliasWithOtherSource]} />
        </TestProviders>
      );

      expect(getByText('Logs Endpoint')).toBeInTheDocument();
      // logs-endpoint is de-duplicated across both records, so only entityanalytics_okta overflows.
      expect(getByTestId('entitySourceValue-more')).toHaveTextContent('+1');
    });

    it('shows the union of watchlists across the group', () => {
      const { getByText, getByTestId } = render(
        <TestProviders>
          <EntitySummaryGrid entityRecord={target} aliasRecords={[alias]} />
        </TestProviders>
      );

      expect(getByText('First Watchlist')).toBeInTheDocument();
      // watchlist-1 is de-duplicated across both records, so only watchlist-2 overflows.
      expect(getByTestId('entityWatchlistsCell-more')).toHaveTextContent('+1');
    });

    it('falls back to single-record behaviour when aliasRecords is empty', () => {
      const { container } = render(
        <TestProviders>
          <EntitySummaryGrid
            entityRecord={target}
            aliasRecords={[]}
            criticalityLevel="high_impact"
            onCriticalitySave={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        container.querySelector('[data-euiicon-type="chevronSingleDown"]')
      ).toBeInTheDocument();
    });
  });
});
