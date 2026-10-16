/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActivityEntry } from '@kbn/significant-events-detection-engine-plugin/common';
import React, { useState } from 'react';
import { formatTime } from './format';
import { ROUTINE_ACTIONS, STEP_LABELS, STEP_TONES } from './labels';
import { useToneColors } from './use_tone_colors';

function isOpening(entry: ActivityEntry): boolean {
  return entry.step === 'state' && (entry.action === 'opened' || entry.action === 'reopened');
}

interface IEventTimelineProps {
  activity: ActivityEntry[];
  /** The event's current occurrence, so numbering stays right when old entries are cut off. */
  episode: number;
}

/** What the engine did with one event, oldest first, with the every-minute entries folded away. */
export function EventTimeline({ activity, episode }: IEventTimelineProps) {
  const [showRoutine, setShowRoutine] = useState(false);
  const toneColors = useToneColors();
  // The API returns newest first; a story reads oldest first.
  const ordered = [...activity].reverse();
  const shown = showRoutine
    ? ordered
    : ordered.filter((entry) => !ROUTINE_ACTIONS.has(entry.action));
  const hidden = ordered.length - shown.length;
  // The occurrence each entry belongs to: each open or reopen starts the next one.
  const occurrences = shown.reduce<number[]>((numbers, entry) => {
    numbers.push((numbers[numbers.length - 1] ?? 0) + (isOpening(entry) ? 1 : 0));
    return numbers;
  }, []);
  const openings = occurrences[occurrences.length - 1] ?? 0;

  return (
    <div data-test-subj="detectionEngineEventTimeline">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.timeline.title', {
                defaultMessage: 'What the engine did, step by step',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {(hidden > 0 || showRoutine) && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              data-test-subj="detectionEngineTimelineRoutine"
              label={
                showRoutine
                  ? i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.timeline.routineOn',
                      {
                        defaultMessage: 'Every-minute entries shown',
                      }
                    )
                  : i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.timeline.routineOff',
                      {
                        defaultMessage: 'Show {count} every-minute entries',
                        values: { count: hidden },
                      }
                    )
              }
              checked={showRoutine}
              onChange={(event) => setShowRoutine(event.target.checked)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs">
        {shown.map((entry, index) => {
          // Entries written by the removed demo lab are still stored for up to 30 days.
          const tone = toneColors[STEP_TONES[entry.step] ?? 'neutral'];
          return (
            <React.Fragment key={`${entry['@timestamp']}-${index}`}>
              {isOpening(entry) && (
                <EuiTitle size="xxxs">
                  <h4 style={{ marginTop: index === 0 ? 4 : 12 }}>
                    {i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.timeline.occurrence',
                      {
                        defaultMessage: 'Occurrence {number}, raised at {time}',
                        values: {
                          number: episode - (openings - occurrences[index]),
                          time: formatTime(entry['@timestamp']),
                        },
                      }
                    )}
                  </h4>
                </EuiTitle>
              )}
              <div
                style={{
                  backgroundColor: tone.background,
                  borderLeft: `3px solid ${tone.border}`,
                  padding: '2px 6px',
                  marginTop: 2,
                  borderRadius: 4,
                }}
              >
                <span style={{ display: 'inline-block', minWidth: 72 }}>
                  {formatTime(entry['@timestamp'])}
                </span>
                <strong>{STEP_LABELS[entry.step] ?? entry.step}</strong> {entry.message}
              </div>
            </React.Fragment>
          );
        })}
      </EuiText>
    </div>
  );
}
