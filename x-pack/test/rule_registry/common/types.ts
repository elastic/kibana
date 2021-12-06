/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GenericFtrProviderContext } from '@kbn/test';
import { Alert, AlertTypeParams } from '../../../plugins/alerting/common';
import { services } from './services';

export type GetService = GenericFtrProviderContext<typeof services, {}>['getService'];

export interface AlertParams extends AlertTypeParams {
  windowSize?: number;
  windowUnit?: string;
  threshold?: number;
  serviceName?: string;
  transactionType?: string;
  environment?: string;
}

export type AlertDef<Params extends AlertTypeParams = {}> = Partial<Alert<Params>>;
