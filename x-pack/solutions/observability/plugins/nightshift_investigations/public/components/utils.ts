/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? i18n.translate('xpack.nightshiftInvestigations.flyout.unknownTime', {
        defaultMessage: 'Unknown time',
      })
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatDuration = (startedAt: string, endedAt: string): string => {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) {
    return i18n.translate('xpack.nightshiftInvestigations.flyout.durationMinutes', {
      defaultMessage: '{mins} min',
      values: { mins },
    });
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0
    ? i18n.translate('xpack.nightshiftInvestigations.flyout.durationHoursMinutes', {
        defaultMessage: '{hrs}h {rem}m',
        values: { hrs, rem },
      })
    : i18n.translate('xpack.nightshiftInvestigations.flyout.durationHours', {
        defaultMessage: '{hrs}h',
        values: { hrs },
      });
};
