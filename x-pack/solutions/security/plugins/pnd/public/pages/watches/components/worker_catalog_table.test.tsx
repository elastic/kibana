/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCHES_SEED, type WatchWorker } from '@kbn/pnd-common';
import { PND_INVESTIGATION_AGENT_ID } from '../../../../common/constants';
import { renderWithPndProviders } from '../../../components/test_utils/render_with_pnd_providers';
import { PHASE_LABELS } from '../../../components/phase_group/phase_group';
import * as i18n from '../workers/translations';
import { WorkerCatalogTable, type WorkerCatalogTableProps } from './worker_catalog_table';

/**
 * `WatchBadges` resolves each id against the watch list read, which is not what this suite is about.
 */
jest.mock('../../../hooks/use_watches_api', () => ({
  useWatches: jest.fn(),
}));

const { useWatches } = jest.requireMock('../../../hooks/use_watches_api');

/** Shaped exactly as `projectWorkers` emits it, for the real `open_investigation` step. */
const openInvestigation: WatchWorker = {
  agentId: PND_INVESTIGATION_AGENT_ID,
  agentName: 'Watch Investigator',
  id: 'open_investigation',
  phase: 'investigation',
  skillIds: ['alert-analysis', 'entity-analytics'],
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
};

const defaultProps: WorkerCatalogTableProps = {
  caption: 'Workers',
  'data-test-subj': 'pndWorkersTable',
  noItemsMessage: i18n.NO_WORKERS,
  showWatches: true,
  workers: [openInvestigation],
};

const renderTable = (overrides: Partial<WorkerCatalogTableProps> = {}) =>
  renderWithPndProviders(<WorkerCatalogTable {...defaultProps} {...overrides} />);

describe('WorkerCatalogTable', () => {
  beforeEach(() => {
    useWatches.mockReturnValue({ data: { watches: WATCHES_SEED }, isLoading: false });
  });

  it('names the worker from the copy keyed by its step name', () => {
    renderTable();

    expect(screen.getByText(i18n.workerName('open_investigation'))).toBeInTheDocument();
  });

  it("describes what the step does, from the lane's own comments", () => {
    renderTable();

    expect(
      screen.getByText(i18n.workerDescription('open_investigation') as string)
    ).toBeInTheDocument();
  });

  /**
   * A projected step with no copy yet must still be listed: the catalog is the lane's YAML, so a new
   * `ai.agent` step appears here the moment it is added, before anyone writes a name for it.
   */
  it('falls back to the raw step name for a worker with no copy', () => {
    renderTable({ workers: [{ ...openInvestigation, id: 'assess_blast_radius' }] });

    expect(screen.getByText('assess_blast_radius')).toBeInTheDocument();
  });

  it('renders the phase through the shared lifecycle labels', () => {
    renderTable();

    expect(screen.getByText(PHASE_LABELS.investigation)).toBeInTheDocument();
  });

  it('names the agent the step runs', () => {
    renderTable();

    expect(screen.getByText('Watch Investigator')).toBeInTheDocument();
  });

  /** Agent Builder owns the skills, so their ids are shown as-is rather than translated. */
  it("lists the agent's skill ids verbatim", () => {
    renderTable();

    expect(
      screen.getByText(i18n.workerSkills('alert-analysis, entity-analytics'))
    ).toBeInTheDocument();
  });

  it('says so when the agent is configured with no skills', () => {
    renderTable({ workers: [{ ...openInvestigation, skillIds: [] }] });

    expect(screen.getByText(i18n.NO_SKILLS)).toBeInTheDocument();
  });

  /**
   * The 2026-08-10 declutter removed the per-row enable toggles from both catalogs and the watch
   * detail page (bead kibana-phf4.33). This table used to render a checked-and-disabled switch with a
   * tooltip saying why; the design's answer is that the row carries no control at all.
   */
  describe('per-row enable toggle (removed by the 2026-08-10 declutter)', () => {
    it('renders no switch for a worker', () => {
      renderTable();

      expect(
        screen.queryByTestId('pndWorkerAlwaysRuns-open_investigation')
      ).not.toBeInTheDocument();
    });

    it('renders no checkbox-role control at all, whatever it were named', () => {
      renderTable();

      expect(screen.queryAllByRole('switch')).toEqual([]);
    });
  });

  /** A description is one line, and the full text is reachable by hovering it. */
  it('carries the full description as the title of the truncated line', () => {
    renderTable();

    const description = i18n.workerDescription('open_investigation') as string;

    expect(screen.getByText(description)).toHaveAttribute('title', description);
  });

  it('attributes the worker to its watches on the catalog page', () => {
    renderTable();

    expect(
      screen.getByTestId(`pndWatchBadge-${SYSTEM_SECURITY_WATCH_FLOOR_ID}`)
    ).toBeInTheDocument();
  });

  it('omits the watches column under a watch, which already names itself', () => {
    renderTable({ showWatches: false });

    expect(
      screen.queryByTestId(`pndWatchBadge-${SYSTEM_SECURITY_WATCH_FLOOR_ID}`)
    ).not.toBeInTheDocument();
  });

  /**
   * The 2026-08-13 declutter hides the column header on the **watch detail** page's section, whose title
   * already names the list — and deliberately not on the standalone catalog, where the header is what a
   * customer scans a multi-column table by. One component serves both, so both directions are pinned.
   */
  describe('column headers (2026-08-13 declutter)', () => {
    it('keeps them on the catalog page, where they are the affordance', () => {
      const { container } = renderTable();

      expect(getComputedStyle(container.querySelector('thead') as Element).display).not.toBe(
        'none'
      );
      expect(screen.getByText(i18n.COL_WORKER)).toBeInTheDocument();
    });

    it('hides them under a watch, whose section title already names the list', () => {
      const { container } = renderTable({ hideColumnHeaders: true, showWatches: false });

      expect(getComputedStyle(container.querySelector('thead') as Element).display).toBe('none');
    });

    /**
     * The caption is what names the table once the header is out of the accessibility tree, so this is
     * the assertion that makes hiding the header safe rather than merely tidy.
     *
     * Awaited, and that is not incidental: `EuiBasicTable` renders `tableCaption` inside an
     * `EuiDelayRender`, so the `<caption>` element exists **empty** on first paint and fills in after a
     * delay. A synchronous `expect` here passes against an empty caption and proves nothing — measured
     * while writing this test. `toHaveTextContent` is a substring match, which also absorbs the trailing
     * comma EUI appends before its item-count clause.
     */
    it('still names the table for a screen reader when they are hidden', async () => {
      const { container } = renderTable({ hideColumnHeaders: true, showWatches: false });

      await waitFor(() =>
        expect(container.querySelector('caption')).toHaveTextContent(defaultProps.caption)
      );
    });
  });

  it('renders the empty message when the projection is empty', () => {
    renderTable({ workers: [] });

    expect(screen.getByText(i18n.NO_WORKERS)).toBeInTheDocument();
  });

  it('renders the error the caller passes', () => {
    renderTable({ error: i18n.LOAD_ERROR, workers: [] });

    expect(screen.getByText(i18n.LOAD_ERROR)).toBeInTheDocument();
  });
});
