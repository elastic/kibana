/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PHASE_SIGNAL_TRIAGE = i18n.translate('xpack.pnd.phaseGroup.signalTriageLabel', {
  defaultMessage: 'Phase 1 · Signal triage',
});

export const PHASE_INVESTIGATION = i18n.translate('xpack.pnd.phaseGroup.investigationLabel', {
  defaultMessage: 'Phase 2 · Investigation',
});

export const PHASE_INCIDENT_RESPONSE = i18n.translate(
  'xpack.pnd.phaseGroup.incidentResponseLabel',
  {
    defaultMessage: 'Phase 3 · Incident response',
  }
);

export const PHASE_POST_INCIDENT = i18n.translate('xpack.pnd.phaseGroup.postIncidentLabel', {
  defaultMessage: 'Phase 4 · Post-incident follow-on',
});

export const stepCount = (count: number): string =>
  i18n.translate('xpack.pnd.phaseGroup.stepCount', {
    defaultMessage: '{count, plural, one {# step} other {# steps}}',
    values: { count },
  });
