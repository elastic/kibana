/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { OverviewTab } from './overview_tab';
import { InsightsSection } from '../components/insights_section';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

vi.mock('../components/ai_summary_section', () => {
  const mocked = {
    AISummarySection: ({ hit }: { hit: DataTableRecord }) => (
      <div data-test-subj="mock-ai-summary-section" data-hit-id={(hit as { id: string }).id} />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../components/visualizations_section', () => {
  const mocked = {
    VisualizationsSection: ({ hit }: { hit: DataTableRecord }) => (
      <div data-test-subj="mock-visualizations-section" data-hit-id={(hit as { id: string }).id} />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../components/insights_section', () => {
  const mocked = {
    InsightsSection: vi.fn(() => <div data-test-subj="mock-insights-section" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/is_in_security_app');

// Keep the tool panels light: they are only referenced as children of the (mocked) system flyout.
vi.mock('../../tools/correlations', () => {
  const mocked = {
    CorrelationsDetails: () => <div data-test-subj="mock-correlations-details" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../tools/entities', () => {
  const mocked = {
    EntitiesDetails: () => <div data-test-subj="mock-entities-details" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../document/main/document_flyout_wrapper', () => {
  const mocked = {
    DocumentFlyoutWrapper: () => <div data-test-subj="mock-document-flyout-wrapper" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: ({ children }: { children: React.ReactNode }) => children,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../shared/hooks/use_default_flyout_properties', async () => {
  const actual = await vi.importActual('../../../shared/hooks/use_default_flyout_properties');
  return { ...actual, useDefaultDocumentFlyoutProperties: vi.fn(() => ({})) };
});

const mockedInsightsSection = vi.mocked(InsightsSection);

const buildHit = (extra: Record<string, unknown> = {}): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: { _id: 'attack-1', _index: '.alerts-security.attack-discovery.alerts-default' },
    flattened: {
      _id: 'attack-1',
      _index: '.alerts-security.attack-discovery.alerts-default',
      'kibana.alert.attack_discovery.summary_markdown_with_replacements': 'Summary text',
      ...extra,
    },
    isAnchor: false,
  } as unknown as DataTableRecord);

const renderTab = (
  hit: DataTableRecord,
  {
    openSystemFlyout = vi.fn(),
    renderCellActions = vi.fn(),
  }: { openSystemFlyout?: Mock; renderCellActions?: Mock } = {}
) => {
  const startServices = createStartServicesMock();
  openSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
  startServices.overlays = { ...startServices.overlays, openSystemFlyout };
  return render(
    <TestProviders startServices={startServices}>
      <OverviewTab hit={hit} onAttackUpdated={vi.fn()} renderCellActions={renderCellActions} />
    </TestProviders>
  );
};

describe('<OverviewTab />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsInSecurityApp).mockReturnValue(true);
  });

  it('renders the overview tab container', () => {
    renderTab(buildHit());
    expect(screen.getByTestId('attack-flyout-overview-tab')).toBeInTheDocument();
  });

  it('renders all three sections: summary, visualizations, and insights', () => {
    renderTab(buildHit());
    expect(screen.getByTestId('mock-ai-summary-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-visualizations-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-insights-section')).toBeInTheDocument();
  });

  it('passes hit to AISummarySection and VisualizationsSection', () => {
    renderTab(buildHit());
    expect(screen.getByTestId('mock-ai-summary-section')).toHaveAttribute(
      'data-hit-id',
      'attack-1'
    );
    expect(screen.getByTestId('mock-visualizations-section')).toHaveAttribute(
      'data-hit-id',
      'attack-1'
    );
  });

  it('passes onShowEntities/onShowCorrelations callbacks to InsightsSection', () => {
    renderTab(buildHit());

    expect(mockedInsightsSection).toHaveBeenCalledWith(
      expect.objectContaining({
        onShowEntities: expect.any(Function),
        onShowCorrelations: expect.any(Function),
      }),
      expect.anything()
    );
  });

  it('opens the Entities tool as a system flyout when onShowEntities is invoked', () => {
    const openSystemFlyout = vi.fn();
    renderTab(buildHit(), { openSystemFlyout });

    const { onShowEntities } = mockedInsightsSection.mock.calls[0][0];
    onShowEntities();

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('opens the Correlations tool as a system flyout when onShowCorrelations is invoked', () => {
    const openSystemFlyout = vi.fn();
    renderTab(buildHit(), { openSystemFlyout });

    const { onShowCorrelations } = mockedInsightsSection.mock.calls[0][0];
    onShowCorrelations();

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start', historyKey: documentFlyoutHistoryKey })
    );
  });

  it('uses the discover history key when outside the security app', () => {
    vi.mocked(useIsInSecurityApp).mockReturnValue(false);
    const openSystemFlyout = vi.fn();
    renderTab(buildHit(), { openSystemFlyout });

    const { onShowEntities } = mockedInsightsSection.mock.calls[0][0];
    onShowEntities();

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'start', historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY })
    );
  });
});
