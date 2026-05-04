/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CreateCompositeSLOForm } from './types';

export const MAX_WIDTH = 900;
export const MAX_COMPOSITE_MEMBERS = 25;

export const COMPOSITE_ROLLING_TIMEWINDOW_OPTIONS = [
  {
    value: '7d',
    text: i18n.translate('xpack.slo.compositeSloEdit.rollingTimeWindow.7days', {
      defaultMessage: '7 days',
    }),
  },
  {
    value: '30d',
    text: i18n.translate('xpack.slo.compositeSloEdit.rollingTimeWindow.30days', {
      defaultMessage: '30 days',
    }),
  },
  {
    value: '90d',
    text: i18n.translate('xpack.slo.compositeSloEdit.rollingTimeWindow.90days', {
      defaultMessage: '90 days',
    }),
  },
  {
    value: '180d',
    text: i18n.translate('xpack.slo.compositeSloEdit.rollingTimeWindow.180days', {
      defaultMessage: '180 days',
    }),
  },
  {
    value: '365d',
    text: i18n.translate('xpack.slo.compositeSloEdit.rollingTimeWindow.365days', {
      defaultMessage: '365 days',
    }),
  },
];

export const COMPOSITE_SLO_EDIT_FORM_DEFAULT_VALUES: CreateCompositeSLOForm = {
  name: '',
  description: '',
  members: [],
  timeWindow: {
    duration: '30d',
    type: 'rolling',
  },
  objective: {
    target: 99,
  },
  tags: [],
};
