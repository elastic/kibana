/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
import { OBSERVABILITY_ALERTS_SKILL } from './observability_alerts_skill';
import { OBSERVABILITY_ALERTS_EXECUTION_SKILL } from './observability_alerts_execution_skill';
import { OBSERVABILITY_APM_SKILL } from './observability_apm_skill';
import { OBSERVABILITY_CASES_SKILL } from './observability_cases_skill';
import { OBSERVABILITY_LOGS_SKILL } from './observability_logs_skill';
import { OBSERVABILITY_METRICS_SKILL } from './observability_metrics_skill';
import { OBSERVABILITY_SLO_READONLY_SKILL } from './observability_slo_readonly_skill';
import { OBSERVABILITY_SLOS_SKILL } from './observability_slos_skill';
import { OBSERVABILITY_SYNTHETICS_SKILL } from './observability_synthetics_skill';

export const registerSkills = (plugins: ObservabilityAgentBuilderPluginSetupDependencies) => {
  plugins.onechat.skills.register(OBSERVABILITY_ALERTS_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_APM_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_LOGS_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_METRICS_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_SLOS_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_SYNTHETICS_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_CASES_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_ALERTS_EXECUTION_SKILL);
  plugins.onechat.skills.register(OBSERVABILITY_SLO_READONLY_SKILL);
};



