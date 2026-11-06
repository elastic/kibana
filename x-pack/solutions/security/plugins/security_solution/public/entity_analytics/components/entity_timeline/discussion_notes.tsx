/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype-only: open questions for the product trio, pinned next to the
 * parts of the timeline they are about. Toggled from the Prototype settings menu.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

let showDiscussionNotes = true;
const listeners = new Set<(next: boolean) => void>();

export const setShowDiscussionNotes = (next: boolean): void => {
  showDiscussionNotes = next;
  listeners.forEach((listener) => listener(next));
};

export const useShowDiscussionNotes = (): boolean => {
  const [current, setCurrent] = useState(showDiscussionNotes);
  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
};

export const DISCUSSION_NOTES = {
  lensScope:
    'Full history and the risk explanation share one component. Is a separate Timeline tab right, or should Risk contributions be a filter preset of it?',
  retention:
    'A year of history outlives alert and anomaly retention in many clusters. What do we show when the source documents are gone?',
  volume:
    'Real entities can have thousands of alerts. Bursts are grouped here; do we also need server-side summarization or sampling?',
  keyEvents:
    'Key events need baselines ("first DCSync in 365 days"). Who computes them: the risk engine, Entity store, or AlertZero?',
  attackZoom:
    'Zooming into an attack scopes this entity’s timeline. Does the same view belong in Attack discovery with all entities, and who owns it?',
  notInAttack:
    'This alert matches the attack but Attack discovery has not correlated it. Should analysts be able to add it from here?',
  alertZero:
    'Can analysts approve AlertZero proposed actions from the entity timeline, or only review them here?',
  additive:
    'The engine’s score is not a plain sum. Showing contributions as additive is easier to read but slightly inaccurate. Is that acceptable?',
  topInputs:
    'Each persisted score keeps only its 10 highest inputs. The history of older contributions has to be reconstructed or the cap raised.',
  modifiersCarried:
    'Modifiers set before the risk window still count. Should they appear as pinned state or as the original event?',
  excluded:
    'Showing what does not count (closed alerts, raw anomalies) answers "why isn’t my score higher?" but adds noise. Default on or off?',
  resolution:
    'Events come from three resolved records (AD, Okta, Workday). Do we label the record, or filter by it?',
} as const;

export type DiscussionNoteId = keyof typeof DISCUSSION_NOTES;

export const DiscussionNote: React.FC<{ id: DiscussionNoteId }> = ({ id }) => {
  const isVisible = useShowDiscussionNotes();
  if (!isVisible) return null;
  return (
    <EuiToolTip content={DISCUSSION_NOTES[id]} title="Discuss">
      <EuiBadge
        color="accent"
        iconType="comment"
        tabIndex={0}
        aria-label={`Discussion note: ${DISCUSSION_NOTES[id]}`}
        data-test-subj={`entityTimelineDiscussion-${id}`}
      >
        Discuss
      </EuiBadge>
    </EuiToolTip>
  );
};
