/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LogRateAnalysisPanel } from './log_rate_analysis_panel';
import { BurnRateAlert, BurnRateRule } from '../../../types';

interface Props {
  slo: GetSLOResponse;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

export function CustomKqlPanels({ slo, alert, rule }: Props) {
  const {
    services: { application },
  } = useKibana();
  const aiopsEnabled = application?.capabilities.aiops?.enabled ?? false;
  return aiopsEnabled ? <LogRateAnalysisPanel slo={slo} alert={alert} rule={rule} /> : null;
}
