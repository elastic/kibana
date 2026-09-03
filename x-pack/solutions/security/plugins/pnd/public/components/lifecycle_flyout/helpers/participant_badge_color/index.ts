/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';

/**
 * The tones a participant badge can carry, from the prototype's `BlackHatWatcherTone`
 * (`src/events/blackHatTriage.ts:10` at `10e153f`).
 *
 * A tone rather than a colour so that the vocabulary the participants derivation speaks stays
 * independent of the EUI palette this file resolves it against.
 */
export const PARTICIPANT_TONES = ['accent', 'primary', 'success', 'warning'] as const;

export type PndParticipantTone = (typeof PARTICIPANT_TONES)[number];

const COLOR_BY_TONE: Readonly<Record<PndParticipantTone, EuiBadgeProps['color']>> = {
  accent: 'accent',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
};

/**
 * The badge colour one participant's tone renders as.
 *
 * Total over `undefined`, which is the honest tone of a **custom** watch: PND registers a tone for
 * each of the five managed watches and cannot invent one for a workflow it has never seen, so those
 * badges render hollow — the same fallback the prototype takes (`EventFlyoutBody.tsx:370`).
 */
export const participantBadgeColor = (
  tone: PndParticipantTone | undefined
): EuiBadgeProps['color'] => (tone != null ? COLOR_BY_TONE[tone] : 'hollow');
