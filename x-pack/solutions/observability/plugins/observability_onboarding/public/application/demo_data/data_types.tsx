/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type DemoDataType = 'apm' | 'logs' | 'infra';

export interface DataTypeMeta {
  label: string;
  /** EUI icon type used to visually differentiate the data a resource targets. */
  iconType: string;
}

export const DATA_TYPE_META: Record<DemoDataType, DataTypeMeta> = {
  apm: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.apm', {
      defaultMessage: 'APM services',
    }),
    iconType: 'apmTrace',
  },
  logs: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.logs', {
      defaultMessage: 'Logs',
    }),
    iconType: 'documents',
  },
  infra: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.infra', {
      defaultMessage: 'Infra hosts',
    }),
    iconType: 'storage',
  },
};
