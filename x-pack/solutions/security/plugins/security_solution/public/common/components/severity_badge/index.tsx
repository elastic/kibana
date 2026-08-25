/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { upperFirst } from 'lodash/fp';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import { useEuiTheme } from '@elastic/eui';
import { HealthTruncateText } from '../health_truncate_text';
import { useRiskSeverityColors } from '../../utils/risk_color_palette';

interface Props {
  value: Severity;
  'data-test-subj'?: string;
}

const SeverityBadgeComponent: React.FC<Props> = ({
  value,
  'data-test-subj': dataTestSubj = 'severity',
}) => {
  const { euiTheme } = useEuiTheme();
  const displayValue = upperFirst(value);
  const severityToColorMap = useRiskSeverityColors();
  const color = severityToColorMap[value] ?? euiTheme.colors.textSubdued;

  return (
    <HealthTruncateText
      healthColor={color}
      tooltipContent={displayValue}
      dataTestSubj={dataTestSubj}
    >
      {displayValue}
    </HealthTruncateText>
  );
};

export const SeverityBadge = React.memo(SeverityBadgeComponent);
