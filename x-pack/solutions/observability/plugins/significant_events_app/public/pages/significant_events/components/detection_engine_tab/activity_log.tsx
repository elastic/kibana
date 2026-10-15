/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActivityEntry, ActivityStep } from '@kbn/significant-events-plugin/common';
import React, { useState } from 'react';
import { useDetectionEngineActivity } from '../../../../hooks/use_detection_engine_activity';
import { ROUTINE_ACTIONS, STEP_LABELS, STEP_TONES } from './labels';
import { useToneColors } from './use_tone_colors';

type ActivityGroup = 'all' | 'decisions' | 'ai' | 'checks' | 'people';

const GROUP_STEPS: Record<Exclude<ActivityGroup, 'all'>, ActivityStep[]> = {
  decisions: ['strategy', 'baseline', 'identity', 'join', 'state', 'cap', 'trial'],
  ai: ['agent', 'learning'],
  checks: ['verifier', 'publish'],
  people: ['operator', 'lab'],
};

const GROUP_OPTIONS: Array<{ id: ActivityGroup; label: string }> = [
  {
    id: 'all',
    label: i18n.translate('xpack.significantEventsApp.detectionEngine.activity.all', {
      defaultMessage: 'Everything',
    }),
  },
  {
    id: 'decisions',
    label: i18n.translate('xpack.significantEventsApp.detectionEngine.activity.decisions', {
      defaultMessage: 'Decisions in code',
    }),
  },
  {
    id: 'ai',
    label: i18n.translate('xpack.significantEventsApp.detectionEngine.activity.ai', {
      defaultMessage: 'AI and learning',
    }),
  },
  {
    id: 'checks',
    label: i18n.translate('xpack.significantEventsApp.detectionEngine.activity.checks', {
      defaultMessage: 'Re-checks and hand-off',
    }),
  },
  {
    id: 'people',
    label: i18n.translate('xpack.significantEventsApp.detectionEngine.activity.people', {
      defaultMessage: 'People and lab',
    }),
  },
];

function isShown({
  entry,
  group,
  showRoutine,
}: {
  entry: ActivityEntry;
  group: ActivityGroup;
  showRoutine: boolean;
}): boolean {
  if (!showRoutine && ROUTINE_ACTIONS.has(entry.action)) {
    return false;
  }
  return group === 'all' || GROUP_STEPS[group].includes(entry.step);
}

interface IActivityLogProps {
  onOpenEvent: (eventId: string) => void;
}

/** The engine activity log: every decision, including the decisions not to raise an event. */
export function ActivityLog({ onOpenEvent }: IActivityLogProps) {
  const [group, setGroup] = useState<ActivityGroup>('all');
  const [showRoutine, setShowRoutine] = useState(false);
  const { data } = useDetectionEngineActivity({});
  const colors = useToneColors();
  const entries = (data?.activity ?? []).filter((entry) => isShown({ entry, group, showRoutine }));

  return (
    <div data-test-subj="detectionEngineActivityLog">
      <EuiFlexGroup alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.significantEventsApp.detectionEngine.activity.legend', {
              defaultMessage: 'Show activity of',
            })}
            options={GROUP_OPTIONS}
            idSelected={group}
            onChange={(id) => setGroup(id as ActivityGroup)}
            buttonSize="compressed"
            data-test-subj="detectionEngineActivityGroups"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.significantEventsApp.detectionEngine.activity.routine', {
              defaultMessage: 'Show every-minute entries',
            })}
            checked={showRoutine}
            onChange={(event) => setShowRoutine(event.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {entries.length === 0 && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.activity.empty', {
            defaultMessage: 'Nothing to show for this filter yet.',
          })}
        </EuiText>
      )}
      {entries.map((entry, index) => {
        const tone = colors[STEP_TONES[entry.step]];
        return (
          <EuiFlexGroup
            key={`${entry['@timestamp']}-${index}`}
            gutterSize="s"
            responsive={false}
            alignItems="flexStart"
            style={{
              borderLeft: `3px solid ${tone.border}`,
              backgroundColor: tone.background,
              padding: '4px 8px',
              marginBottom: 2,
              borderRadius: 4,
            }}
          >
            <EuiFlexItem grow={false} style={{ width: 70 }}>
              <EuiText size="xs" color="subdued">
                {new Date(entry['@timestamp']).toLocaleTimeString()}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 110 }}>
              <EuiText size="xs">
                <strong>{STEP_LABELS[entry.step]}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                {entry.message}{' '}
                {entry.event_id && (
                  <EuiLink
                    data-test-subj="detectionEngineActivityOpenEvent"
                    onClick={() => onOpenEvent(entry.event_id!)}
                  >
                    {i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.activity.openEvent',
                      {
                        defaultMessage: 'open event',
                      }
                    )}
                  </EuiLink>
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );
}
