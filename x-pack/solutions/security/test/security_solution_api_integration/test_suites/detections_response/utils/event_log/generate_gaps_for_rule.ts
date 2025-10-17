/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { faker } from '@faker-js/faker';
import type { Client } from '@elastic/elasticsearch';
import { chunk } from 'lodash';

export type GapEvent = { _id?: string | null | undefined } & ReturnType<
  typeof generateNonOverlappingGapEvents
>[0];

const ingestGapEvents = async (client: Client, gapEvents: GapEvent[]) => {
  if (!client) throw new Error('Failed to get ES client');

  const chunks = chunk(gapEvents, 1000);

  for (const aChunk of chunks) {
    const operations = aChunk.flatMap((doc) => [
      { create: { _index: '.kibana-event-log-ds' } },
      doc,
    ]);

    const response = await client.bulk({ operations, refresh: true });
    // enrich the gaps with the created id
    aChunk.forEach((gap, idx) => {
      gap._id = response.items[idx]?.create?._id;
    });
  }
};

const generateNonOverlappingGapEvents = (
  ruleId: string,
  ruleName: string,
  fromHours: number,
  gapCount: number
) => {
  const totalMinutes = fromHours * 60;
  // Calculate maximum duration for each gap including spacing
  const maxTimePerGap = Math.floor(totalMinutes / gapCount);

  // Ensure minimum values are at least 1
  const minGapDuration = Math.max(1, Math.min(5, Math.floor(maxTimePerGap * 0.6))); // 60% of available time
  const maxGapDuration = Math.max(
    minGapDuration + 1,
    Math.min(30, Math.floor(maxTimePerGap * 0.8))
  ); // 80% of available time
  const maxSpaceBetweenGaps = Math.max(1, Math.floor(maxTimePerGap * 0.2)); // 20% of available time

  const gaps: Array<{ start: number; end: number }> = [];
  let currentTimePoint = 0;

  // Generate exactly gapCount gaps
  for (let i = 0; i < gapCount; i++) {
    const gapDuration = faker.number.int({
      min: minGapDuration,
      max: maxGapDuration,
    });
    const spaceBetweenGaps = faker.number.int({
      min: 1,
      max: maxSpaceBetweenGaps,
    });

    const gapEnd = currentTimePoint + spaceBetweenGaps;
    const gapStart = gapEnd + gapDuration;

    currentTimePoint = gapStart;
    gaps.push({ start: gapEnd, end: gapStart });
  }

  // Convert minute-based gaps to actual gap events
  return gaps.map((gap) => {
    const gapDurationMs = (gap.end - gap.start) * 60 * 1000;
    const gapEndTime = moment().subtract(gap.start, 'minutes');
    const gapStartTime = moment().subtract(gap.end, 'minutes');

    const range = {
      gte: gapStartTime.toISOString(),
      lte: gapEndTime.toISOString(),
    };

    return {
      '@timestamp': range.lte,
      event: {
        provider: 'alerting',
        action: 'gap',
        kind: 'alert',
        category: ['siem'],
      },
      kibana: {
        alert: {
          rule: {
            revision: 1,
            rule_type_id: 'siem.queryRule',
            consumer: 'siem',
            execution: {
              uuid: faker.string.uuid(),
            },
            gap: {
              range,
              filled_intervals: [],
              in_progress_intervals: [],
              unfilled_intervals: [range],
              status: 'unfilled',
              total_gap_duration_ms: gapDurationMs,
              filled_duration_ms: 0,
              unfilled_duration_ms: gapDurationMs,
              in_progress_duration_ms: 0,
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'alert',
            id: ruleId,
            type_id: 'siem.queryRule',
          },
        ],
        space_ids: ['default'],
        server_uuid: '5d29f261-1b85-4d90-9088-53e0e0e87c7c',
        version: '9.1.0',
      },
      rule: {
        id: ruleId,
        license: 'basic',
        category: 'siem.queryRule',
        ruleset: 'siem',
        name: ruleName,
      },
      ecs: {
        version: '1.8.0',
      },
    };
  });
};

export const generateGapsForRule = async (
  esClient: Client,
  rule: { id: string; name: string },
  gapsCount: number
) => {
  let gapEvents: GapEvent[] = [];
  if (gapsCount > 0) {
    // Generate non-overlapping gap events for each rule
    gapEvents = generateNonOverlappingGapEvents(
      rule.id,
      rule.name || 'Unknown Rule',
      24 * 90,
      gapsCount
    );
  }

  await ingestGapEvents(esClient, gapEvents);

  return { gapEvents };
};
