/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GenericFtrProviderContext } from '@kbn/test';
import {
  Rule,
  RuleTypeParams,
  ActionGroupIdsOf,
  AlertInstanceState as AlertState,
  AlertInstanceContext as AlertContext,
} from '@kbn/alerting-plugin/common';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import { services } from './services';

export type GetService = GenericFtrProviderContext<typeof services, {}>['getService'];

export interface AlertParams extends RuleTypeParams {
  windowSize?: number;
  windowUnit?: string;
  threshold?: number;
  serviceName?: string;
  transactionType?: string;
  environment?: string;
}

export type AlertDef<Params extends RuleTypeParams = {}> = Partial<Rule<Params>>;

export type MockRuleParams = Record<string, any>;
export type MockRuleState = RuleTypeState & {
  testObject?: {
    id: string;
    values: Array<{ name: string; value: number }>;
    host: {
      name: string;
    };
  };
};

export const FIRED_ACTIONS = {
  id: 'observability.fired',
  name: 'Alert',
};

export type MockAlertState = AlertState;
export type MockAlertContext = AlertContext;
export type MockAllowedActionGroups = ActionGroupIdsOf<typeof FIRED_ACTIONS>;
