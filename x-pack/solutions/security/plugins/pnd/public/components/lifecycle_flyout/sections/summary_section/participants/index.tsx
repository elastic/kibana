/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { buildFlyoutParticipants } from '../../../helpers/build_flyout_participants';
import { participantBadgeColor } from '../../../helpers/participant_badge_color';
import * as i18n from '../../../translations';

export interface LifecycleParticipantsProps {
  steps: readonly PndPhaseStepProjection[];
}

/**
 * Who is watching this discovery: one badge per watch that ran a step of it.
 *
 * This lives in the flyout rather than on the queue row (decision D7). The prototype moved the
 * landing row's "Watched by" footer into the flyout's Participants section at `10e153f`
 * (`src/pages/landing/flyout/EventFlyoutBody.tsx:358-380`), which is what this is a port of.
 *
 * "No participants" is rendered explicitly rather than by collapsing the section away. A discovery
 * that correlated to no watch run is a real state — an older discovery legitimately correlates to
 * nothing — and an empty row would read as a section that failed to load rather than as an answer.
 */
export const LifecycleParticipants: React.FC<LifecycleParticipantsProps> = ({ steps }) => {
  const participants = useMemo(() => buildFlyoutParticipants(steps), [steps]);

  return (
    <div data-test-subj="pndLifecycleParticipants">
      <EuiTitle size="xxs">
        <h3>{i18n.OVERVIEW_PARTICIPANTS_LABEL}</h3>
      </EuiTitle>

      <EuiSpacer size="xs" />

      {participants.length === 0 ? (
        <EuiText color="subdued" data-test-subj="pndLifecycleParticipantsEmpty" size="s">
          <p>{i18n.OVERVIEW_PARTICIPANTS_EMPTY}</p>
        </EuiText>
      ) : (
        <EuiFlexGroup
          aria-label={i18n.participantsAriaLabel(participants.length)}
          gutterSize="s"
          responsive={false}
          wrap
        >
          {participants.map(({ label, tone, workflowId }) => (
            <EuiFlexItem grow={false} key={workflowId}>
              <EuiBadge
                color={participantBadgeColor(tone)}
                data-test-subj={`pndLifecycleParticipant-${workflowId}`}
              >
                {label}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
};
