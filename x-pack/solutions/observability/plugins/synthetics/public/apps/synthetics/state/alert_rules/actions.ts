/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusRuleInspect } from '../../../../../common/runtime_types/alert_rules/common';
import { StatusRuleParamsProps } from '../../components/alerts/status_rule_ui';
import { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { createAsyncAction } from '../utils/actions';

export const getDefaultAlertingAction = createAsyncAction<void, DEFAULT_ALERT_RESPONSE>(
  'getDefaultAlertingAction'
);

export const enableDefaultAlertingAction = createAsyncAction<void, DEFAULT_ALERT_RESPONSE>(
  'enableDefaultAlertingAction'
);

export const enableDefaultAlertingSilentlyAction = createAsyncAction<void, DEFAULT_ALERT_RESPONSE>(
  'enableDefaultAlertingSilentlyAction'
);

export const updateDefaultAlertingAction = createAsyncAction<void, DEFAULT_ALERT_RESPONSE>(
  'updateDefaultAlertingAction'
);

export const inspectStatusRuleAction = createAsyncAction<
  StatusRuleParamsProps['ruleParams'],
  StatusRuleInspect
>('inspectStatusRuleAction');
