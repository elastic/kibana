/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  StatusRuleInspect,
  TLSRuleInspect,
} from '../../../../../common/runtime_types/alert_rules/common';
import type { StatusRuleParamsProps } from '../../components/alerts/status_rule_ui';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import type { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { apiService } from '../../../../utils/api_service';

export async function inspectStatusAlertAPI(
  ruleParams: StatusRuleParamsProps['ruleParams']
): Promise<StatusRuleInspect> {
  return apiService.post(SYNTHETICS_API_URLS.INSPECT_STATUS_RULE, ruleParams);
}

export async function inspectTLSAlertAPI(
  ruleParams: StatusRuleParamsProps['ruleParams']
): Promise<TLSRuleInspect> {
  return apiService.post(SYNTHETICS_API_URLS.INSPECT_TLS_RULE, ruleParams);
}

export async function getDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function enableDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return retry(() => apiService.post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING));
}

export async function updateDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return retry(() => apiService.put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING));
}

async function retry<T>(fn: () => Promise<T>, retries = 2, delay = 10): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // unreachable
  throw new Error();
}
