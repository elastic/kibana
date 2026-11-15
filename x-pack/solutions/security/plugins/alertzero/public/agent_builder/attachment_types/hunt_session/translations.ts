/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.alertzero.agentBuilder.attachments.huntSession';

export const DEFAULT_LABEL = i18n.translate(`${PREFIX}.label`, { defaultMessage: 'Hunt session' });

export const INVALID_DATA = i18n.translate(`${PREFIX}.invalidData`, {
  defaultMessage: 'This hunt session cannot be shown',
});

export const INVALID_DATA_BODY = i18n.translate(`${PREFIX}.invalidDataBody`, {
  defaultMessage: 'Its stored data is not in a format this version understands.',
});

export const TRIGGER_MANUAL = i18n.translate(`${PREFIX}.triggerManual`, {
  defaultMessage: 'Analyst hunt',
});

export const TRIGGER_AUTOMATED = i18n.translate(`${PREFIX}.triggerAutomated`, {
  defaultMessage: 'Automated hunt',
});

export const EXTENDED_BY_ANALYST = i18n.translate(`${PREFIX}.extendedByAnalyst`, {
  defaultMessage: 'Extended by an analyst',
});

export const ADJUDICATION_HEADING = i18n.translate(`${PREFIX}.adjudicationHeading`, {
  defaultMessage: 'Why this was raised',
});

export const EVIDENCE_HEADING = i18n.translate(`${PREFIX}.evidenceHeading`, {
  defaultMessage: 'Preserved evidence',
});

export const EVIDENCE_TABLE_CAPTION = i18n.translate(`${PREFIX}.evidenceTableCaption`, {
  defaultMessage: 'Evidence rows preserved from this hunt',
});

export const PRESERVATION_HEADING = (count: number) =>
  i18n.translate(`${PREFIX}.preservationHeading`, {
    defaultMessage: '{count, plural, one {# row} other {# rows}}',
    values: { count },
  });

export const PRESERVATION_BY = (actor: string) =>
  i18n.translate(`${PREFIX}.preservationBy`, {
    defaultMessage: 'preserved by {actor}',
    values: { actor },
  });

export const TIME_RANGE = (from: string, to: string) =>
  i18n.translate(`${PREFIX}.timeRange`, {
    defaultMessage: 'Time range: {from} to {to}',
    values: { from, to },
  });

export const COUNT_COLUMN = i18n.translate(`${PREFIX}.countColumn`, { defaultMessage: 'Count' });

export const VIEW_IN_HUNT_LIBRARY = i18n.translate(`${PREFIX}.viewInHuntLibrary`, {
  defaultMessage: 'View hunt in Hunt Library',
});

export const TIME_RANGE_RELATIVE = (from: string, to: string) =>
  i18n.translate(`${PREFIX}.timeRangeRelative`, {
    defaultMessage: '{from} to {to}',
    values: { from, to },
  });

export const TIME_RANGE_RESOLVED = ({
  from,
  to,
  relative,
}: {
  from: Date;
  to: Date;
  relative: string;
}) =>
  i18n.translate(`${PREFIX}.timeRangeResolved`, {
    defaultMessage: 'Time range: {from} to {to} ({relative})',
    values: {
      from: from.toLocaleString(),
      to: to.toLocaleString(),
      relative,
    },
  });

export const CONTINUE_HUNT = i18n.translate(`${PREFIX}.continueHunt`, {
  defaultMessage: 'Continue hunt in Discover',
});

export const CONTINUE_UNAVAILABLE = i18n.translate(`${PREFIX}.continueUnavailable`, {
  defaultMessage: 'This hunt session does not record its Investigation, so it cannot be continued.',
});

export const CONTINUE_FAILED = i18n.translate(`${PREFIX}.continueFailed`, {
  defaultMessage: 'Unable to continue the hunt',
});
