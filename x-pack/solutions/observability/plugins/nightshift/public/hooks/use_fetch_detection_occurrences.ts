/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import {
  DETECTION_OCCURRENCE_BUCKET_SIZE,
  getDetectionOccurrenceTimeRange,
  type OccurrencePoint,
} from '../detection/change_point';
import { useKibana } from './use_kibana';

export type DetectionOccurrencesByRuleUuid = ReadonlyMap<string, OccurrencePoint[]>;

interface DetectionOccurrencesRequest {
  from: string;
  to: string;
  ruleUuids: string[];
  streamNames: string[];
}

export const buildDetectionOccurrencesRequest = (
  detections: readonly LifecycleDetection[]
): DetectionOccurrencesRequest | undefined => {
  const fetchableDetections = detections.flatMap((detection) => {
    const { rule_uuid: ruleUuid, '@timestamp': timestamp } = detection;
    const range = getDetectionOccurrenceTimeRange(timestamp);
    return ruleUuid && range ? [{ detection, range, ruleUuid }] : [];
  });

  if (fetchableDetections.length === 0) {
    return undefined;
  }

  return {
    from: new Date(Math.min(...fetchableDetections.map(({ range }) => range.from))).toISOString(),
    to: new Date(Math.max(...fetchableDetections.map(({ range }) => range.to))).toISOString(),
    ruleUuids: [...new Set(fetchableDetections.map(({ ruleUuid }) => ruleUuid))].sort(),
    streamNames: [
      ...new Set(
        fetchableDetections
          .map(({ detection }) => detection.stream_name)
          .filter((streamName): streamName is string => Boolean(streamName))
      ),
    ].sort(),
  };
};

const toOccurrencePoints = (
  occurrences: ReadonlyArray<{ date: string; count: number }>
): OccurrencePoint[] =>
  occurrences
    .map(({ date, count }) => ({ x: new Date(date).getTime(), y: count }))
    .filter(({ x }) => Number.isFinite(x));

export const mapOccurrencesByRuleUuid = (
  queries: ReadonlyArray<{
    rule_uuid?: string;
    occurrences: ReadonlyArray<{ date: string; count: number }>;
  }>
): DetectionOccurrencesByRuleUuid => {
  const byRuleUuid = new Map<string, OccurrencePoint[]>();

  for (const { rule_uuid: ruleUuid, occurrences } of queries) {
    if (!ruleUuid) {
      continue;
    }
    const points = toOccurrencePoints(occurrences);
    const existing = byRuleUuid.get(ruleUuid);
    if (!existing || points.length > existing.length) {
      byRuleUuid.set(ruleUuid, points);
    }
  }

  return byRuleUuid;
};

export const useFetchDetectionOccurrences = (
  detections: readonly LifecycleDetection[]
): UseQueryResult<DetectionOccurrencesByRuleUuid, Error> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const request = useMemo(() => buildDetectionOccurrencesRequest(detections), [detections]);

  return useQuery<DetectionOccurrencesByRuleUuid, Error>({
    queryKey: ['nightshift.detectionOccurrences', request],
    enabled: request != null,
    queryFn: async ({ signal }) => {
      if (!request) {
        return new Map();
      }

      const response = await significantEventsRepositoryClient.fetch(
        'GET /internal/streams/_query_occurrences',
        {
          params: {
            query: {
              from: request.from,
              to: request.to,
              bucketSize: DETECTION_OCCURRENCE_BUCKET_SIZE,
              rule_uuid: request.ruleUuids,
              streamNames: request.streamNames,
            },
          },
          signal: signal ?? null,
        }
      );

      return mapOccurrencesByRuleUuid(response.queries);
    },
  });
};
