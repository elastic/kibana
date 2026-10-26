/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignalVerdict } from '@kbn/significant-events-schema';

const VERDICT_LABELS: Record<SignalVerdict, string> = {
  confirms: i18n.translate('xpack.nightshift.detectionFlyout.verdict.confirmsBadge', {
    defaultMessage: 'Confirmed',
  }),
  refutes: i18n.translate('xpack.nightshift.detectionFlyout.verdict.refutesBadge', {
    defaultMessage: 'Refuted',
  }),
  off_topic: i18n.translate('xpack.nightshift.detectionFlyout.verdict.offTopicBadge', {
    defaultMessage: 'Off topic',
  }),
  inconclusive: i18n.translate('xpack.nightshift.detectionFlyout.verdict.inconclusiveBadge', {
    defaultMessage: 'Inconclusive',
  }),
  not_checked: i18n.translate('xpack.nightshift.detectionFlyout.verdict.notCheckedBadge', {
    defaultMessage: 'Not checked',
  }),
};

const VERDICT_BADGE_COLORS: Record<SignalVerdict, 'success' | 'warning' | 'default'> = {
  confirms: 'success',
  refutes: 'default',
  off_topic: 'default',
  inconclusive: 'warning',
  not_checked: 'warning',
};

export function getVerdictBadge(
  verdict?: SignalVerdict
): { label: string; color: 'success' | 'warning' | 'default' } | undefined {
  if (!verdict) {
    return undefined;
  }
  return { label: VERDICT_LABELS[verdict], color: VERDICT_BADGE_COLORS[verdict] };
}
