/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import type { SignalVerdict } from '@kbn/significant-events-schema';
export const signalVerdicts: Record<
  SignalVerdict,
  { label: string; color: string; icon: IconType }
> = {
  confirms: {
    label: i18n.translate('xpack.significantEventsApp.evidence.confirms', {
      defaultMessage: 'Confirms',
    }),
    color: 'danger',
    icon: 'checkCircleFill',
  },
  refutes: {
    label: i18n.translate('xpack.significantEventsApp.evidence.refutes', {
      defaultMessage: 'Refutes',
    }),
    color: 'success',
    icon: 'crossCircle',
  },
  off_topic: {
    label: i18n.translate('xpack.significantEventsApp.evidence.offTopic', {
      defaultMessage: 'Off topic',
    }),
    color: 'hollow',
    icon: 'branch',
  },
  inconclusive: {
    label: i18n.translate('xpack.significantEventsApp.evidence.inconclusive', {
      defaultMessage: 'Inconclusive',
    }),
    color: 'warning',
    icon: 'question',
  },
  not_checked: {
    label: i18n.translate('xpack.significantEventsApp.evidence.notChecked', {
      defaultMessage: 'Not checked',
    }),
    color: 'hollow',
    icon: 'clock',
  },
};
