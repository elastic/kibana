/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { SeverityOption } from '@kbn/ml-plugin/public/application/explorer/hooks/use_severity_options';
import { AnomaliesTab } from './anomalies_tab';
import { ANOMALIES_TAB_ERROR_TEST_ID } from './test_ids';

// ─── Hook mocks ──────────────────────────────────────────────────────────────

const mockUseAnomalyOverview = jest.fn();
const mockUseAnomalySummary = jest.fn();

jest.mock('../../api/hooks/use_anomaly_overview', () => ({
  useAnomalyOverview: (...args: unknown[]) => mockUseAnomalyOverview(...args),
}));

jest.mock('../../api/hooks/use_anomaly_summary', () => ({
  useAnomalySummary: (...args: unknown[]) => mockUseAnomalySummary(...args),
}));

// ─── Severity options ─────────────────────────────────────────────────────────

// Five fixed options mirroring the real ML anomaly thresholds.
// Defined here for use in test bodies; the mock factory below must inline its
// own copy because jest.mock factories are hoisted before these declarations.
const WARNING = {
  val: 3,
  display: 'Warning',
  color: '',
  threshold: { min: 3, max: 25 } as const,
};
const MINOR = { val: 25, display: 'Minor', color: '', threshold: { min: 25, max: 50 } as const };
const MAJOR = { val: 50, display: 'Major', color: '', threshold: { min: 50, max: 75 } as const };
const CRITICAL = { val: 75, display: 'Critical', color: '', threshold: { min: 75 } as const };

// Capture the SeverityLegendControl onChange so tests can drive severity changes.
let onSeverityChange: ((opts: SeverityOption[]) => void) | undefined;

// ─── Child component mocks ────────────────────────────────────────────────────

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: () => <div data-test-subj="mock-date-range-picker" />,
}));

// Capture onSelectTactic so tests can drive tactic selection.
let onSelectTactic: ((tactic: string) => void) | undefined;
jest.mock('./mitre/components/mitre_attack_chain', () => ({
  MitreAttackChain: ({
    onSelectTactic: handler,
    selectedTactic,
    anomalyCountByTactic,
    triggeredTactics,
    showPersistentFirstTacticBadge,
  }: {
    onSelectTactic?: (t: string) => void;
    selectedTactic?: string | null;
    anomalyCountByTactic?: Record<string, number>;
    triggeredTactics: string[];
    showPersistentFirstTacticBadge?: boolean;
  }) => {
    onSelectTactic = handler;
    return (
      <div
        data-test-subj="mock-mitre-attack-chain"
        data-selected-tactic={selectedTactic ?? ''}
        data-tactic-counts={JSON.stringify(anomalyCountByTactic ?? {})}
        data-triggered-tactics={JSON.stringify(triggeredTactics)}
        data-show-persistent-first-tactic-badge={String(Boolean(showPersistentFirstTacticBadge))}
        data-has-select-handler={String(handler !== undefined)}
      />
    );
  },
}));

jest.mock('./anomalies_tab_timeline', () => ({
  AnomalyTabTimelineSection: ({
    isLoading,
    isEmpty,
  }: {
    isLoading?: boolean;
    isEmpty?: boolean;
  }) => (
    <div
      data-test-subj="mock-timeline"
      data-is-loading={String(Boolean(isLoading))}
      data-is-empty={String(Boolean(isEmpty))}
    />
  ),
}));

jest.mock('./anomalies_tab_table', () => ({
  AnomalyTabTableSection: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-test-subj="mock-table" data-is-loading={String(Boolean(isLoading))} />
  ),
}));

// ─── Infrastructure mocks ─────────────────────────────────────────────────────

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: { colors: {}, font: { weight: {} }, size: {}, levels: {} },
    }),
    useEuiFontSize: () => ({ fontSize: '12px' }),
  };
});

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { ml: {} } }),
}));

jest.mock('@kbn/ml-plugin/public', () => ({
  ML_PAGES: { ANOMALY_DETECTION_JOBS_MANAGE: 'jobs' },
  useMlManagementHref: () => '/ml/jobs',
  useSeverityOptions: () => [
    { val: 0, display: 'Low', color: '', threshold: { min: 0, max: 25 } },
    { val: 25, display: 'Warning', color: '', threshold: { min: 25, max: 50 } },
    { val: 50, display: 'Minor', color: '', threshold: { min: 50, max: 75 } },
    { val: 75, display: 'Major', color: '', threshold: { min: 75, max: 100 } },
    { val: 100, display: 'Critical', color: '', threshold: { min: 100 } },
  ],
  SeverityLegendControl: ({ onChange }: { onChange: (opts: SeverityOption[]) => void }) => {
    onSeverityChange = onChange;
    return <div data-test-subj="mock-severity-control" />;
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyOverview = {
  data: { tacticCounts: {}, anomalyByTimeBucket: [], recentAnomalies: [], from: 0, to: 1 },
  error: null,
  isFetching: false,
  isLoading: false,
  isError: false,
};
const emptySummary = {
  data: { anomalies: [], page: 1, page_size: 10, total: 0 },
  error: null,
  isFetching: false,
  isLoading: false,
  isError: false,
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const defaultProps = { entityId: 'host-1', entityType: 'host' as const };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AnomaliesTab', () => {
  beforeEach(() => {
    mockUseAnomalyOverview.mockReturnValue(emptyOverview);
    mockUseAnomalySummary.mockReturnValue(emptySummary);
    onSeverityChange = undefined;
    onSelectTactic = undefined;
  });

  describe('basic structure', () => {
    it('renders the "Attack chain" section heading', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByText('Attack chain')).toBeInTheDocument();
    });

    it('renders the "Manage ML jobs" link', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByText('Manage ML jobs')).toBeInTheDocument();
    });

    it('renders the attack chain, timeline, and table sections', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mock-mitre-attack-chain')).toBeInTheDocument();
      expect(screen.getByTestId('mock-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('mock-table')).toBeInTheDocument();
    });
  });

  describe('scoreFilter', () => {
    it('passes no score ranges when all severities are selected', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({ scoreRanges: undefined })
      );
    });

    it('emits one range per selected severity (no critical)', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      // Select only Warning [3,25) and Minor [25,50)
      act(() => {
        onSeverityChange!([WARNING, MINOR] as unknown as SeverityOption[]);
      });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scoreRanges: [
            { min_score: 3, max_score: 25 },
            { min_score: 25, max_score: 50 },
          ],
        })
      );
    });

    it('emits an unbounded range for critical', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      // Select Major [50,75) and Critical [75,∞)
      act(() => {
        onSeverityChange!([MAJOR, CRITICAL] as unknown as SeverityOption[]);
      });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scoreRanges: [
            { min_score: 50, max_score: 75 },
            { min_score: 75, max_score: undefined },
          ],
        })
      );
    });

    it('does not re-include a deselected middle range when critical remains selected', () => {
      // Regression test for https://github.com/elastic/kibana/issues/277648: collapsing the
      // selection into a single min/max span silently re-included the deselected Major range
      // whenever critical (which has no upper bound) stayed selected.
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      // Select Warning, Minor, and Critical, but deselect Major [50,75).
      act(() => {
        onSeverityChange!([WARNING, MINOR, CRITICAL] as unknown as SeverityOption[]);
      });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scoreRanges: [
            { min_score: 3, max_score: 25 },
            { min_score: 25, max_score: 50 },
            { min_score: 75, max_score: undefined },
          ],
        })
      );
    });

    it('passes the same score ranges to useAnomalySummary', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      act(() => {
        onSeverityChange!([MAJOR] as unknown as SeverityOption[]);
      });
      expect(mockUseAnomalySummary).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ score_ranges: [{ min_score: 50, max_score: 75 }] }),
        })
      );
    });
  });

  describe('date range too old error', () => {
    it('shows error callout when overview returns a 400 with the date-range message', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: null,
        error: {
          response: { status: 400 },
          body: { message: '`from` must not be older than 1 year' },
        },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(
        screen.getByText(
          'Anomaly data is only available for the past year. Select a more recent start date.'
        )
      ).toBeInTheDocument();
    });

    it('shows error callout when summary returns the same 400 error', () => {
      mockUseAnomalySummary.mockReturnValue({
        ...emptySummary,
        data: null,
        error: {
          response: { status: 400 },
          body: { message: '`from` must not be older than 1 year' },
        },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(
        screen.getByText(
          'Anomaly data is only available for the past year. Select a more recent start date.'
        )
      ).toBeInTheDocument();
    });

    it('does not show error callout when there is no error', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(
        screen.queryByText(
          'Anomaly data is only available for the past year. Select a more recent start date.'
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('tactic selection', () => {
    // The auto-clear useEffect wipes selectedTactic when it is absent from uniqueTactics.
    // These tests prime tacticCounts with the tactic so the effect does not intervene.

    it('passes selectedTactic to useAnomalyOverview when a tactic is selected', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 3 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      act(() => {
        onSelectTactic!('Initial Access');
      });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({ threatTactics: ['Initial Access'] })
      );
    });

    it('passes selectedTactic as a filter to useAnomalySummary', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { Execution: 2 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      act(() => {
        onSelectTactic!('Execution');
      });
      expect(mockUseAnomalySummary).toHaveBeenLastCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ threat_tactics: ['Execution'] }),
        })
      );
    });

    it('deselects the tactic when the same tactic is selected again', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 3 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      act(() => {
        onSelectTactic!('Initial Access');
      });
      act(() => {
        onSelectTactic!('Initial Access');
      });
      expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({ threatTactics: undefined })
      );
    });

    it('reflects selectedTactic on the MitreAttackChain', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { Persistence: 1 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      act(() => {
        onSelectTactic!('Persistence');
      });
      expect(screen.getByTestId('mock-mitre-attack-chain')).toHaveAttribute(
        'data-selected-tactic',
        'Persistence'
      );
    });

    it('auto-clears selectedTactic when it is absent from the overview tactic counts', async () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 3 } },
      });
      const { rerender } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSelectTactic!('Initial Access');
      });

      // Simulate the overview returning without the selected tactic (e.g. after a refetch).
      // We need to rerender so the component picks up the updated mock return value.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: {} },
        isFetching: false,
      });
      rerender(<AnomaliesTab {...defaultProps} />);

      // The useEffect sees selectedTactic not in uniqueTactics and calls setSelectedTactic(null),
      // which triggers another render where useAnomalyOverview receives threatTactics: undefined.
      await waitFor(() => {
        expect(mockUseAnomalyOverview).toHaveBeenLastCalledWith(
          expect.objectContaining({ threatTactics: undefined })
        );
      });
    });
  });

  describe('MitreAttackChain data', () => {
    it('passes tacticCounts from overview data to MitreAttackChain', () => {
      const tacticCounts = { 'Initial Access': 3, Execution: 1 };
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      const chain = screen.getByTestId('mock-mitre-attack-chain');
      expect(JSON.parse(chain.getAttribute('data-tactic-counts') ?? '{}')).toEqual(tacticCounts);
    });

    it('passes the tactic keys as triggeredTactics', () => {
      const tacticCounts = { 'Initial Access': 3, Execution: 1 };
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      const chain = screen.getByTestId('mock-mitre-attack-chain');
      const triggeredTactics = JSON.parse(chain.getAttribute('data-triggered-tactics') ?? '[]');
      expect(triggeredTactics).toEqual(expect.arrayContaining(['Initial Access', 'Execution']));
    });
  });

  describe('attack chain loading state', () => {
    it('renders a loading chart placeholder instead of the MitreAttackChain while overview is loading', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: undefined,
        isLoading: true,
      });
      const { container } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(container.querySelector('.euiLoadingChart')).toBeInTheDocument();
      // The placeholder renders a hidden MitreAttackChain with no tactic data.
      expect(screen.getByTestId('mock-mitre-attack-chain')).toHaveAttribute(
        'data-triggered-tactics',
        '[]'
      );
    });

    it('renders the real MitreAttackChain once overview finishes loading', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isLoading: false,
      });
      const { container } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(container.querySelector('.euiLoadingChart')).not.toBeInTheDocument();
      expect(screen.getByTestId('mock-mitre-attack-chain')).toHaveAttribute(
        'data-triggered-tactics',
        JSON.stringify(['Initial Access'])
      );
    });

    it('hides the attack chain accordion once loading finishes with no tactics', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: {} },
        isLoading: false,
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.queryByTestId('mock-mitre-attack-chain')).not.toBeInTheDocument();
    });
  });

  describe('attack chain empty state', () => {
    it('shows the persistent first tactic badge and disables tactic selection when totalAnomaliesCount is 0', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: {
          ...emptyOverview.data,
          tacticCounts: { 'Initial Access': 1 },
          totalAnomaliesCount: 0,
        },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      const chain = screen.getByTestId('mock-mitre-attack-chain');
      expect(chain).toHaveAttribute('data-show-persistent-first-tactic-badge', 'true');
      expect(chain).toHaveAttribute('data-has-select-handler', 'false');
      expect(chain).toHaveAttribute('data-selected-tactic', '');
    });

    it('does not show the persistent first tactic badge and allows tactic selection when there are anomalies', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: {
          ...emptyOverview.data,
          tacticCounts: { 'Initial Access': 1 },
          totalAnomaliesCount: 5,
        },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      const chain = screen.getByTestId('mock-mitre-attack-chain');
      expect(chain).toHaveAttribute('data-show-persistent-first-tactic-badge', 'false');
      expect(chain).toHaveAttribute('data-has-select-handler', 'true');
    });
  });

  describe('timeline and table loading/empty props', () => {
    it('sets the timeline isLoading prop from useAnomalyOverview.isLoading', () => {
      mockUseAnomalyOverview.mockReturnValue({ ...emptyOverview, isLoading: true });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');
    });

    it('sets the timeline isEmpty prop when the overview has no time bucket anomalies', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, anomalyByTimeBucket: [] },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-empty', 'true');
    });

    it('clears the timeline isLoading and isEmpty props when overview has data and no error', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, anomalyByTimeBucket: [{ x: 0, y: 1 }] },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      const timeline = screen.getByTestId('mock-timeline');
      expect(timeline).toHaveAttribute('data-is-loading', 'false');
      expect(timeline).toHaveAttribute('data-is-empty', 'false');
    });

    it('sets the table isLoading prop from useAnomalySummary.isLoading', () => {
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isLoading: true });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'true');
    });
  });

  describe('filter-triggered loading state', () => {
    it('shows loading for the timeline and table immediately after a tactic is clicked', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSelectTactic!('Initial Access');
      });

      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'true');
    });

    it('shows loading for the timeline and table immediately after the severity selection changes', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSeverityChange!([MAJOR] as unknown as SeverityOption[]);
      });

      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'true');
    });

    it('clears the filter-triggered loading state once both queries finish fetching', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      const { rerender } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSelectTactic!('Initial Access');
      });
      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');

      // Simulate the tactic-triggered refetch actually starting.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isFetching: true,
      });
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isFetching: true });
      rerender(<AnomaliesTab {...defaultProps} />);
      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'true');

      // Once both queries settle, the filter-triggered loading state clears.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isFetching: false,
      });
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isFetching: false });
      rerender(<AnomaliesTab {...defaultProps} />);

      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'false');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'false');
    });

    it('clears the timeline loading state as soon as the overview settles, even while the summary is still fetching', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      const { rerender } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSelectTactic!('Initial Access');
      });

      // Both refetches start.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isFetching: true,
      });
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isFetching: true });
      rerender(<AnomaliesTab {...defaultProps} />);

      // The overview settles first, but the summary is still fetching.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isFetching: false,
      });
      rerender(<AnomaliesTab {...defaultProps} />);

      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'false');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'true');
    });

    it('clears the table loading state as soon as the summary settles, even while the overview is still fetching', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
      });
      const { rerender } = render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });

      act(() => {
        onSelectTactic!('Initial Access');
      });

      // Both refetches start.
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: { ...emptyOverview.data, tacticCounts: { 'Initial Access': 1 } },
        isFetching: true,
      });
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isFetching: true });
      rerender(<AnomaliesTab {...defaultProps} />);

      // The summary settles first, but the overview is still fetching.
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, isFetching: false });
      rerender(<AnomaliesTab {...defaultProps} />);

      expect(screen.getByTestId('mock-timeline')).toHaveAttribute('data-is-loading', 'true');
      expect(screen.getByTestId('mock-table')).toHaveAttribute('data-is-loading', 'false');
    });
  });

  describe('tab error state', () => {
    it('shows the error prompt and hides the attack chain, timeline, and table when the overview errors', () => {
      mockUseAnomalyOverview.mockReturnValue({ ...emptyOverview, data: undefined, isError: true });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId(ANOMALIES_TAB_ERROR_TEST_ID)).toBeInTheDocument();
      expect(screen.queryByTestId('mock-mitre-attack-chain')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-timeline')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-table')).not.toBeInTheDocument();
    });

    it('shows the error prompt and hides the attack chain, timeline, and table when the summary errors', () => {
      mockUseAnomalySummary.mockReturnValue({ ...emptySummary, data: undefined, isError: true });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId(ANOMALIES_TAB_ERROR_TEST_ID)).toBeInTheDocument();
      expect(screen.queryByTestId('mock-mitre-attack-chain')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-timeline')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-table')).not.toBeInTheDocument();
    });

    it('does not show the error prompt when there is no error', () => {
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.queryByTestId(ANOMALIES_TAB_ERROR_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not show the error prompt for the date-range-too-old error, since the specific warning callout covers it', () => {
      mockUseAnomalyOverview.mockReturnValue({
        ...emptyOverview,
        data: undefined,
        isError: true,
        error: {
          response: { status: 400 },
          body: { message: '`from` must not be older than 1 year' },
        },
      });
      render(<AnomaliesTab {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.queryByTestId(ANOMALIES_TAB_ERROR_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
