/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertActivitySignal } from './alert_activity';
import { attackDiscoveriesSignal } from './attack_discoveries';
import { highRiskEntitiesSignal } from './high_risk_entities';
import { huntingLeadsSignal } from './hunting_leads';
import { relationshipsSignal } from './relationships';
import { responseStatusSignal } from './response_status';
import { riskHistorySignal } from './risk_history';
import type { BriefSignal } from './types';

/**
 * Every signal the brief runs, in priority order (the order evidence is registered in, and the
 * order to cut in). Adding a signal means one file plus one line here.
 */
export const BRIEF_SIGNALS: readonly BriefSignal[] = [
  attackDiscoveriesSignal,
  alertActivitySignal,
  highRiskEntitiesSignal,
  responseStatusSignal,
  relationshipsSignal,
  riskHistorySignal,
  huntingLeadsSignal,
];

export { runSignals } from './run_signals';
