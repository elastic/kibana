/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type SynthtraceDataType = 'apm' | 'logs' | 'infra' | 'k8s' | 'synthetics' | 'otel';

export interface DataTypeMeta {
  label: string;
  /** EUI icon type used to visually differentiate the data a scenario ingests. */
  iconType: string;
}

export const DATA_TYPE_META: Record<SynthtraceDataType, DataTypeMeta> = {
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
  k8s: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.k8s', {
      defaultMessage: 'Kubernetes',
    }),
    iconType: 'logoKubernetes',
  },
  synthetics: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.synthetics', {
      defaultMessage: 'Synthetics',
    }),
    iconType: 'heartbeatApp',
  },
  otel: {
    label: i18n.translate('xpack.observability_onboarding.demoData.dataType.otel', {
      defaultMessage: 'OpenTelemetry',
    }),
    iconType: 'globe',
  },
};
