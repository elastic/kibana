/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { emptyDonutColor } from '../../../common/components/charts/donutchart_empty';
import { RISK_SEVERITY_COLOUR } from '../../common';
import type { RiskSeverity } from '../../../../common/search_strategy';

export const useRiskScoreFillColor = () =>
  useCallback(
    (dataName: string) =>
      Object.hasOwn(RISK_SEVERITY_COLOUR, dataName)
        ? RISK_SEVERITY_COLOUR[dataName as RiskSeverity]
        : emptyDonutColor,
    []
  );
