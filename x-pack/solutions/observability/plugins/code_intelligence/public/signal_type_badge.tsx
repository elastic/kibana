/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { CATALOG_SIGNAL_TYPES, type CatalogSignalType } from '../common/catalog_filters';

type SignalType = CatalogSignalType;

export const signalTypeLabels: Record<SignalType, string> = {
  log: i18n.translate('xpack.codeIntelligence.signalType.log', { defaultMessage: 'Log' }),
  trace: i18n.translate('xpack.codeIntelligence.signalType.trace', { defaultMessage: 'Trace' }),
  metric: i18n.translate('xpack.codeIntelligence.signalType.metric', {
    defaultMessage: 'Metric',
  }),
};

const signalTypeColors: Record<SignalType, string> = {
  log: 'hollow',
  trace: 'primary',
  metric: 'success',
};

const isSignalType = (value: string | undefined): value is SignalType =>
  value !== undefined && (CATALOG_SIGNAL_TYPES as readonly string[]).includes(value);

export const SignalTypeBadge = ({ signalType }: { signalType?: string }) => (
  <EuiBadge
    color={isSignalType(signalType) ? signalTypeColors[signalType] : 'hollow'}
    data-test-subj="codeIntelligenceSignalTypeBadge"
  >
    {isSignalType(signalType)
      ? signalTypeLabels[signalType]
      : signalType ??
        i18n.translate('xpack.codeIntelligence.signalType.unknown', {
          defaultMessage: 'Unknown',
        })}
  </EuiBadge>
);
