/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_LABEL = i18n.translate('xpack.pnd.conversationKind.incidentLabel', {
  defaultMessage: 'Incident',
});

export const INCIDENT_DESCRIPTION = i18n.translate(
  'xpack.pnd.conversationKind.incidentDescription',
  {
    defaultMessage: 'Phase 3 — containment and response are staged in this conversation.',
  }
);

export const INVESTIGATION_LABEL = i18n.translate('xpack.pnd.conversationKind.investigationLabel', {
  defaultMessage: 'Investigation',
});

export const INVESTIGATION_DESCRIPTION = i18n.translate(
  'xpack.pnd.conversationKind.investigationDescription',
  {
    defaultMessage: 'Phase 2 — the attack is scoped and assessed in this conversation.',
  }
);

/**
 * The naming framework's word for this conversation kind is `Sub-investigation`. The export, the
 * message id and the wire value all stay `thread`: a copy rename may not churn a translation key,
 * and `kind: 'thread'` is on the wire. See the README's "Thread and sub-investigation" note.
 */
export const THREAD_LABEL = i18n.translate('xpack.pnd.conversationKind.threadLabel', {
  defaultMessage: 'Sub-investigation',
});

export const THREAD_DESCRIPTION = i18n.translate('xpack.pnd.conversationKind.threadDescription', {
  defaultMessage:
    'Paired 1:1 with one action — the conversation where that gate’s decision is worked out. Its gate is on the row, because a sub-investigation belongs to an action rather than to a phase.',
});

export const TUNING_LABEL = i18n.translate('xpack.pnd.conversationKind.tuningLabel', {
  defaultMessage: 'Tuning',
});

export const TUNING_DESCRIPTION = i18n.translate('xpack.pnd.conversationKind.tuningDescription', {
  defaultMessage: 'Phase 4 — the detection-rule change is drafted in this conversation.',
});

export const UNKNOWN_LABEL = i18n.translate('xpack.pnd.conversationKind.unknownLabel', {
  defaultMessage: 'Unknown kind',
});

export const unknownDescription = (kind: string): string =>
  i18n.translate('xpack.pnd.conversationKind.unknownDescription', {
    defaultMessage:
      'The server reported the conversation kind "{kind}", which this version of the UI does not recognize.',
    values: { kind },
  });
