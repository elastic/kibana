/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { upperFirst } from 'lodash/fp';
import { euiLightVars } from '@kbn/ui-theme';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';

import { HealthTruncateText } from '../health_truncate_text';

const { euiColorVis0, euiColorVis5, euiColorVis7, euiColorVis9 } = euiLightVars;
const severityToColorMap: Record<Severity, string> = {
  low: euiColorVis0,
  medium: euiColorVis5,
  high: euiColorVis7,
  critical: euiColorVis9,
};

interface Props {
  value: Severity;
  'data-test-subj'?: string;
}

const SeverityBadgeComponent: React.FC<Props> = ({
  value,
  'data-test-subj': dataTestSubj = 'severity',
}) => {
  const displayValue = upperFirst(value);
  const color = severityToColorMap[value] ?? 'subdued';

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
