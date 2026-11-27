/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointType, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { confirmedSignals } from './episode_context';

export interface EventOnset {
  onset_at: string;
  onset_source: 'change_point';
  onset_change_point_type: ChangePointType;
  detected_at: string;
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString();

/**
 * The estimated start of the problem behind a new event: the earliest change point among the
 * detections of its confirming signals, or of every signal when none confirms.
 */
export const eventOnsetOf = ({
  signals,
  detections,
}: {
  signals: SignalEntry[] | undefined;
  detections: Map<string, Pick<Detection, '@timestamp' | 'change_point_at' | 'change_point_type'>>;
}): EventOnset | undefined => {
  const confirmed = confirmedSignals(signals);
  const backing = (confirmed.length > 0 ? confirmed : signals ?? []).flatMap(({ metadata }) => {
    const detection = detections.get(metadata.detection_id);
    return detection?.change_point_at
      ? [
          {
            changePointAt: Date.parse(detection.change_point_at),
            type: detection.change_point_type,
            writtenAt: Date.parse(detection['@timestamp']),
          },
        ]
      : [];
  });
  const [first, ...rest] = backing;
  if (first === undefined) {
    return undefined;
  }
  const onset = rest.reduce(
    (earliest, candidate) =>
      candidate.changePointAt < earliest.changePointAt ? candidate : earliest,
    first
  );
  return {
    onset_at: toIso(onset.changePointAt),
    onset_source: 'change_point',
    onset_change_point_type: onset.type,
    // Only detections with a change point count, so this never precedes the onset.
    detected_at: toIso(Math.min(...backing.map(({ writtenAt }) => writtenAt))),
  };
};
