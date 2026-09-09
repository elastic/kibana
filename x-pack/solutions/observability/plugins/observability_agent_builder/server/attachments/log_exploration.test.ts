/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import type { LogExplorationData, LogExplorationHistogram } from '../../common/log_exploration';
import { createLogExplorationAttachmentType } from './log_exploration';
import type { OBSERVABILITY_LOG_EXPLORATION_ATTACHMENT_TYPE_ID } from '../../common';

type TypeId = typeof OBSERVABILITY_LOG_EXPLORATION_ATTACHMENT_TYPE_ID;

const START_MS = Date.parse('2026-09-04T15:00:00.000Z');
const BASELINE_START_MS = Date.parse('2026-09-04T14:00:00.000Z');
const INTERVAL_MS = 300_000;

const EMPTY_HISTOGRAM: LogExplorationHistogram = {
  intervalMs: INTERVAL_MS,
  startMs: START_MS,
  baselineStartMs: BASELINE_START_MS,
  current: [],
  baseline: [],
};

const formatValue = async (data: LogExplorationData): Promise<string> => {
  const attachment = { id: 'LiDoF1', data } as Attachment<TypeId, LogExplorationData>;
  const formatted = await createLogExplorationAttachmentType().format(
    attachment,
    {} as AttachmentFormatContext
  );
  const representation = await formatted.getRepresentation?.();
  return representation?.type === 'text' ? representation.value : '';
};

const volumeComparisonData = (histogram: LogExplorationHistogram): LogExplorationData => ({
  source: {
    index: 'logs-poc-default',
    messageField: 'message',
    timeRange: { start: 'now-3h', end: 'now' },
  },
  refinements: [],
  view: {
    type: 'volume-comparison',
    baselineEpoch: { start: 'now-4h', end: 'now-1h' },
  },
  result: {
    type: 'volume-comparison',
    generatedAt: '2026-09-04T18:00:00.000Z',
    histogram,
  },
});

describe('log exploration attachment format()', () => {
  describe('pattern table', () => {
    const patternTableData = (excluded: string[]): LogExplorationData => ({
      source: {
        index: 'logs-poc-default',
        messageField: 'message',
        timeRange: { start: 'now-3h', end: 'now' },
      },
      refinements: excluded.map((pattern) => ({
        kind: 'exclude-pattern' as const,
        origin: 'user' as const,
        pattern,
      })),
      view: { type: 'pattern-table' },
      result: {
        type: 'pattern-table',
        generatedAt: '2026-09-04T18:00:00.000Z',
        // The last two stand in for retained muted rows, which a refetch keeps so unmute can render.
        patterns: ['alpha', 'beta', 'gamma', 'noisy-one', 'noisy-two'].map((pattern, index) => ({
          pattern,
          count: 100 - index,
          sparkline: [1, 2],
        })),
      },
    });

    it('states the un-muted count so the model does not have to derive it', async () => {
      const value = await formatValue(patternTableData(['noisy-one', 'noisy-two']));

      expect(value).toContain('The 3 patterns below are the ONLY ones you may discuss');
      // The subtraction it is forbidden from making is the one it was observed making.
      expect(value).toContain('minus the number of muted patterns');
      // 100 of the 297 documents in the cut, and [1, 2] rises by one between the halves.
      expect(value).toContain('- alpha (count: 100, 34% of this cut, trend +1)');
    });

    it('describes the cut over the un-muted rows only', async () => {
      const value = await formatValue(patternTableData(['noisy-one', 'noisy-two']));

      expect(value).toContain('Documents across these patterns: 297');
      expect(value).toContain(`Largest pattern's share of that total: 34% ("alpha")`);
      expect(value).toContain('Trend within the window: 3 rising, 0 falling, 0 flat');
      expect(value).toContain('Steepest rise: "alpha" (+1)');
      expect(value).not.toContain('Steepest fall');
    });

    it('picks the steepest mover in each direction', async () => {
      const value = await formatValue({
        ...patternTableData([]),
        result: {
          type: 'pattern-table',
          generatedAt: '2026-09-04T18:00:00.000Z',
          patterns: [
            { pattern: 'flat', count: 100, sparkline: [10, 10] },
            { pattern: 'up-a-lot', count: 50, sparkline: [1, 1, 40, 40] },
            { pattern: 'up-a-little', count: 40, sparkline: [1, 3] },
            { pattern: 'down', count: 10, sparkline: [30, 5] },
          ],
        },
      });

      expect(value).toContain('Trend within the window: 2 rising, 1 falling, 1 flat');
      // The odd middle bucket is dropped, so [1, 1, 40, 40] compares 1+1 against 40+40.
      expect(value).toContain('Steepest rise: "up-a-lot" (+78)');
      expect(value).toContain('Steepest fall: "down" (-25)');
    });

    it('omits the trend for a sparkline too short to have halves', async () => {
      const value = await formatValue({
        ...patternTableData([]),
        result: {
          type: 'pattern-table',
          generatedAt: '2026-09-04T18:00:00.000Z',
          patterns: [{ pattern: 'single-bucket', count: 10, sparkline: [10] }],
        },
      });

      expect(value).toContain('- single-bucket (count: 10, 100% of this cut)');
      expect(value).not.toContain('Trend within the window');
    });

    it('keeps muted patterns out of the discussable list', async () => {
      const value = await formatValue(patternTableData(['noisy-one', 'noisy-two']));

      const [, discussable] = value.split('The 3 patterns below are the ONLY ones you may discuss');
      expect(discussable).not.toContain('noisy-one');
      expect(discussable).not.toContain('noisy-two');
    });

    it('forbids naming muted patterns while allowing their count', async () => {
      const value = await formatValue(patternTableData(['noisy-one']));

      expect(value).toContain('MUTED PATTERNS (1)');
      expect(value).toContain('Never name them in an');
      expect(value).toContain('may say how many are muted');
    });

    it('says so when every pattern in the cut is muted', async () => {
      const value = await formatValue(
        patternTableData(['alpha', 'beta', 'gamma', 'noisy-one', 'noisy-two'])
      );

      expect(value).toContain('The 0 patterns below are the ONLY ones you may discuss');
      expect(value).toContain('every pattern in the current cut has been muted');
      expect(value).not.toContain('Shape of this cut');
    });
  });

  describe('mutable state', () => {
    it('suppresses the parameters only in a message that renders the view', async () => {
      const value = await formatValue(volumeComparisonData(EMPTY_HISTOGRAM));

      // Still stated, so the model can reason and answer a direct question about them.
      expect(value).toContain('Active time range: now-3h to now');
      expect(value).toContain('Baseline epoch: now-4h to now-1h');
      expect(value).toContain('A MESSAGE THAT ONLY RENDERS THE VIEW');
      expect(value).toContain(
        'Do not state the time range, the baseline epoch or the filter list.'
      );
      expect(value).toContain('durations mentioned in passing');
      expect(value).toContain('A PROSE-ONLY REPLY');
      expect(value).toContain(
        'Say which range, baseline and filters the answer was computed from.'
      );
      expect(value).toContain('If the user asks outright');
      expect(value).toContain('a reading taken now, not a standing fact');
    });

    it('allows attribution above a re-render and forbids it below', async () => {
      const value = await formatValue(volumeComparisonData(EMPTY_HISTOGRAM));

      expect(value).toContain(
        'A REPLY THAT ANALYSES AN EARLIER RESULT AND THEN RE-RENDERS THE VIEW'
      );
      expect(value).toContain('Name the parameters only BEFORE the <render_attachment ... /> tag');
      expect(value).toContain('After the tag, name no range, baseline or filter at all.');
    });

    it('hands the model the tag to re-render with, so it cannot invent an id', async () => {
      const value = await formatValue(volumeComparisonData(EMPTY_HISTOGRAM));

      expect(value).toContain('<render_attachment id="LiDoF1" />');
      expect(value).toContain(
        'Do not re-render when your reply recommends nothing the view can act'
      );
    });

    it('closes with a dated re-read instruction, after the numbers it qualifies', async () => {
      const value = await formatValue(volumeComparisonData(EMPTY_HISTOGRAM));

      expect(value).toContain('END OF READING');
      expect(value).toContain('fetched at 2026-09-04T18:00:00.000Z');
      expect(value).toContain('Call attachments.read on LiDoF1 again');
      // Position is the point: the warning has to age with the data, not precede it.
      expect(value.indexOf('END OF READING')).toBeGreaterThan(
        value.indexOf('Total documents in current range')
      );
    });
  });

  describe('volume comparison', () => {
    it('states the change and the shape the model cannot see', async () => {
      const value = await formatValue(
        volumeComparisonData({
          intervalMs: INTERVAL_MS,
          startMs: START_MS,
          baselineStartMs: BASELINE_START_MS,
          //                 0   1   2    3    4   5
          current: [40, 40, 40, 146, 40, 40],
          baseline: [40, 50, 40, 45, 40, 40],
        })
      );

      // 346 against 255 is +91, and 91 / 255 rounds to 35.7%.
      expect(value).toContain('Total documents in current range: 346');
      expect(value).toContain('Total documents in baseline epoch: 255');
      expect(value).toContain('Change against the baseline: +91 documents, +35.7%');
      // Bucket 3 of the current series, addressed from `startMs`.
      expect(value).toContain(
        'Busiest bucket in the current range: 2026-09-04T15:15:00.000Z (146 documents)'
      );
      // Bucket 1 of the baseline series, addressed from `baselineStartMs` — a different epoch.
      expect(value).toContain(
        'Busiest bucket in the baseline epoch: 2026-09-04T14:05:00.000Z (50 documents)'
      );
      expect(value).toContain(
        'Bucket that moved most against the baseline: 2026-09-04T15:15:00.000Z, 146 now against 45 at the same offset in the baseline (+101)'
      );
    });

    it('reports a drop as a negative change', async () => {
      const value = await formatValue(
        volumeComparisonData({
          intervalMs: INTERVAL_MS,
          startMs: START_MS,
          baselineStartMs: BASELINE_START_MS,
          current: [10, 10],
          baseline: [50, 10],
        })
      );

      expect(value).toContain('Change against the baseline: -40 documents, -66.7%');
      expect(value).toContain(
        'Bucket that moved most against the baseline: 2026-09-04T15:00:00.000Z, 10 now against 50 at the same offset in the baseline (-40)'
      );
    });

    it('does not divide by an empty baseline', async () => {
      const value = await formatValue(
        volumeComparisonData({
          intervalMs: INTERVAL_MS,
          startMs: START_MS,
          baselineStartMs: BASELINE_START_MS,
          current: [10, 20],
          baseline: [0, 0],
        })
      );

      expect(value).toContain(
        'Change against the baseline: +30 documents, (no baseline documents to compare against)'
      );
    });

    it('omits the shape lines rather than inventing a bucket when there is no data', async () => {
      const value = await formatValue(
        volumeComparisonData({
          intervalMs: INTERVAL_MS,
          startMs: START_MS,
          baselineStartMs: BASELINE_START_MS,
          current: [],
          baseline: [],
        })
      );

      expect(value).toContain('Total documents in current range: 0');
      expect(value).not.toContain('Busiest bucket');
      expect(value).not.toContain('moved most');
    });
  });
});
