/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { ENTITY_ANOMALY_TABLE_EMPTY_MESSAGE } from '../translations';

interface AnomaliesTableEmptyMessageProps {
  message?: string;
  className?: string;
}

export const AnomaliesTableEmptyMessage: React.FC<AnomaliesTableEmptyMessageProps> = ({
  message = ENTITY_ANOMALY_TABLE_EMPTY_MESSAGE,
  className = 'entityAnomaliesTableEmptyMessage',
}) => (
  <EuiText size="xs" textAlign="center" className={className}>
    {message}
  </EuiText>
);
