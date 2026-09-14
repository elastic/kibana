/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AnomalyTabTimelineSection } from './anomalies_tab_timeline';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../common/hooks/mitre/use_mitre_configuration.mock';
import type { MitreConfiguration } from '../../../common/hooks/mitre/use_mitre_configuration';

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const mockUseMitreConfiguration = jest.fn<MitreConfiguration, [string[]?]>();

jest.mock('../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (types?: string[]) => mockUseMitreConfiguration(types),
}));

jest.mock('./anomalies_swimlane', () => ({
  AnomaliesSwimlane: ({ yAxisNames, records }: { yAxisNames: string[]; records: unknown[] }) => (
    <div
      data-test-subj="mock-anomalies-swimlane"
      data-y-axis-names={JSON.stringify(yAxisNames)}
      data-record-count={records.length}
    />
  ),
}));

jest.mock('../recent_anomalies/anomaly_bands', () => ({
  useAnomalyBands: () => ({ bands: [] }),
}));

jest.mock('../recent_anomalies', () => ({
  getAnomalyChartStyling: () => ({
    heightOfEachCell: 32,
    heightOfEntityNamesList: (count: number) => count * 32,
  }),
}));

jest.mock('@kbn/charts-plugin/public', () => ({
  EmptyPlaceholder: () => <div data-test-subj="mock-empty-placeholder" />,
}));

jest.mock('@kbn/chart-icons', () => ({ IconChartHeatmap: 'IconChartHeatmap' }));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: { colors: {}, font: { weight: {} }, size: {}, levels: {} },
    }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const makeTactic = (
  id: string,
  name: string,
  position: number
): MitreConfiguration['tactics'][number] => ({
  type: 'tactic',
  framework: 'enterprise',
  framework_version: '16.1',
  id,
  name,
  reference: `https://attack.mitre.org/tactics/${id}/`,
  revoked: false,
  deprecated: false,
  position,
});

const makeAnomaly = (threatTactics: string[], tacticCounts?: Record<string, number>) => ({
  timestamp: '2026-01-01T00:00:00.000Z',
  maxScore: 75,
  threatTactics,
  tacticCounts,
});

const defaultTimeRange = { from: 1_000_000, to: 2_000_000 };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnomalyTabTimelineSection', () => {
  beforeEach(() => {
    mockUseMitreConfiguration.mockReturnValue(createPopulatedMitreConfiguration());
  });

  it('passes types=[tactic] to useMitreConfiguration', () => {
    render(<AnomalyTabTimelineSection anomalies={[]} timeRangeMs={defaultTimeRange} />, {
      wrapper: Wrapper,
    });
    expect(mockUseMitreConfiguration).toHaveBeenCalledWith(['tactic']);
  });

  describe('loading state', () => {
    it('renders the loading chart when isLoading is true', () => {
      const { container } = render(
        <AnomalyTabTimelineSection anomalies={[]} timeRangeMs={defaultTimeRange} isLoading />,
        { wrapper: Wrapper }
      );
      expect(container.querySelector('.euiLoadingChart')).toBeInTheDocument();
    });

    it('does not render the swimlane when isLoading is true', () => {
      render(
        <AnomalyTabTimelineSection anomalies={[]} timeRangeMs={defaultTimeRange} isLoading />,
        { wrapper: Wrapper }
      );
      expect(screen.queryByTestId('mock-anomalies-swimlane')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders the empty placeholder when isEmpty is true', () => {
      render(<AnomalyTabTimelineSection anomalies={[]} timeRangeMs={defaultTimeRange} isEmpty />, {
        wrapper: Wrapper,
      });
      expect(screen.getByTestId('mock-empty-placeholder')).toBeInTheDocument();
    });

    it('does not render the swimlane when isEmpty is true', () => {
      render(<AnomalyTabTimelineSection anomalies={[]} timeRangeMs={defaultTimeRange} isEmpty />, {
        wrapper: Wrapper,
      });
      expect(screen.queryByTestId('mock-anomalies-swimlane')).not.toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    it('renders the swimlane when anomalies are present', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [makeTactic('TA0001', 'Initial Access', 0)],
        })
      );
      render(
        <AnomalyTabTimelineSection
          anomalies={[makeAnomaly(['Initial Access'])]}
          timeRangeMs={defaultTimeRange}
        />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('mock-anomalies-swimlane')).toBeInTheDocument();
    });

    it('passes only tactics present in anomalies to the swimlane y-axis', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
            makeTactic('TA0003', 'Persistence', 2),
          ],
        })
      );
      render(
        <AnomalyTabTimelineSection
          anomalies={[makeAnomaly(['Initial Access', 'Persistence'])]}
          timeRangeMs={defaultTimeRange}
        />,
        { wrapper: Wrapper }
      );
      const swimlane = screen.getByTestId('mock-anomalies-swimlane');
      const yAxisNames = JSON.parse(swimlane.getAttribute('data-y-axis-names') ?? '[]');
      expect(yAxisNames).toEqual(['Initial Access', 'Persistence']);
      expect(yAxisNames).not.toContain('Execution');
    });

    it('filters to only the selectedTactic when one is provided and it is present', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(
        <AnomalyTabTimelineSection
          anomalies={[makeAnomaly(['Initial Access', 'Execution'])]}
          timeRangeMs={defaultTimeRange}
          selectedTactic="Execution"
        />,
        { wrapper: Wrapper }
      );
      const swimlane = screen.getByTestId('mock-anomalies-swimlane');
      const yAxisNames = JSON.parse(swimlane.getAttribute('data-y-axis-names') ?? '[]');
      expect(yAxisNames).toEqual(['Execution']);
    });
  });

  describe('tactic ordering', () => {
    it('orders swimlane y-axis tactics by position ascending', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            // Intentionally out of position order to verify sorting
            makeTactic('TA0003', 'Persistence', 2),
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(
        <AnomalyTabTimelineSection
          anomalies={[makeAnomaly(['Initial Access', 'Execution', 'Persistence'])]}
          timeRangeMs={defaultTimeRange}
        />,
        { wrapper: Wrapper }
      );
      const swimlane = screen.getByTestId('mock-anomalies-swimlane');
      const yAxisNames = JSON.parse(swimlane.getAttribute('data-y-axis-names') ?? '[]');
      expect(yAxisNames).toEqual(['Initial Access', 'Execution', 'Persistence']);
    });
  });

  describe('MITRE loading/error graceful fallback', () => {
    it('renders the swimlane with no y-axis rows when MITRE is loading (empty tactics)', () => {
      mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isLoading: true }));
      render(
        <AnomalyTabTimelineSection
          anomalies={[makeAnomaly(['Initial Access'])]}
          timeRangeMs={defaultTimeRange}
        />,
        { wrapper: Wrapper }
      );
      // Component renders the swimlane frame but with no matched tactic rows
      const swimlane = screen.getByTestId('mock-anomalies-swimlane');
      expect(swimlane).toBeInTheDocument();
      expect(JSON.parse(swimlane.getAttribute('data-y-axis-names') ?? '[]')).toEqual([]);
    });

    it('renders without crashing when MITRE returns an error (empty tactics)', () => {
      mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isError: true }));
      expect(() =>
        render(
          <AnomalyTabTimelineSection
            anomalies={[makeAnomaly(['Initial Access'])]}
            timeRangeMs={defaultTimeRange}
          />,
          { wrapper: Wrapper }
        )
      ).not.toThrow();
    });
  });
});
