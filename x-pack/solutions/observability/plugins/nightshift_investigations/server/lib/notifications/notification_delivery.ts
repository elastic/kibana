/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { investigationNotificationDestinationSchema } from '../../../common';
import type {
  GetInvestigationResponse,
  InvestigationNotificationDestination,
  InvestigationNotificationOutcome,
} from '../../../common';
import { InvalidNotificationDestinationError } from '../../client/errors';
import { slackNotificationHandler } from './slack_notification';

export type NotifiableInvestigation = Pick<
  GetInvestigationResponse,
  'title' | 'status' | 'severity' | 'summary' | 'impact' | 'recommendations' | 'error'
>;

export interface NotificationExecution {
  actionId: string;
  signal?: AbortSignal;
  params: JsonObject;
}

export type ExecuteConnector = (
  execution: NotificationExecution
) => Promise<ActionTypeExecutorResult<unknown>>;

export interface NotificationDelivery {
  params: JsonObject;
  getOutcome: (response: ActionTypeExecutorResult<unknown>) => InvestigationNotificationOutcome;
}

export interface NotificationDeliveryContext {
  notificationDestination: InvestigationNotificationDestination;
  investigation: NotifiableInvestigation;
  url: string;
}

export interface NotificationHandler {
  validateParams: (params: JsonObject) => void;
  prepareDelivery: (context: NotificationDeliveryContext) => NotificationDelivery;
}

const getNotificationHandler = (type: string): NotificationHandler => {
  if (type === 'slack') {
    return slackNotificationHandler;
  }
  throw new InvalidNotificationDestinationError(`Unsupported notification type "${type}"`);
};

/** Validates supported notification types and their destination params before execution or claims. */
export const validateNotificationDestination = (
  notificationDestination: InvestigationNotificationDestination
): void => {
  const destination = investigationNotificationDestinationSchema.parse(notificationDestination);
  getNotificationHandler(destination.type).validateParams(destination.params);
};

/** Prepares connector parameters and delivery confirmation using the selected notification handler. */
export const prepareNotificationDelivery = (
  context: NotificationDeliveryContext
): NotificationDelivery => {
  validateNotificationDestination(context.notificationDestination);
  return getNotificationHandler(context.notificationDestination.type).prepareDelivery(context);
};
