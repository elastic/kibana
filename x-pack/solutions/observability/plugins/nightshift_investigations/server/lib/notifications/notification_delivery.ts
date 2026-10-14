/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { investigationNotificationDestinationSchema } from '../../../common';
import type { InvestigationNotificationDestination, Severity } from '../../../common';
import { InvalidNotificationDestinationError } from '../../client/errors';
import type { NotificationPhase, NotificationOutcome } from './notification_routing';
import { slackNotificationHandler } from './slack_notification';

/** What a lifecycle message says about an investigation. */
export interface NotifiableInvestigation {
  investigation_id: string;
  title: string;
  severity?: Severity;
  summary?: string;
  impact?: { entities?: ReadonlyArray<{ name: string }> };
  /** Proposed actions; the message names the first. */
  recommendations?: ReadonlyArray<{ title: string }>;
  error?: string;
}

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
  getOutcome: (response: ActionTypeExecutorResult<unknown>) => NotificationOutcome;
}

export interface NotificationDeliveryContext {
  notificationDestination: InvestigationNotificationDestination;
  investigation: NotifiableInvestigation;
  url: string;
  phase: NotificationPhase;
  reason?: string;
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

/** Validates supported notification types and their destination params at investigation input boundaries. */
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
  const notificationDestination = investigationNotificationDestinationSchema.parse(
    context.notificationDestination
  );
  return getNotificationHandler(notificationDestination.type).prepareDelivery({
    ...context,
    notificationDestination,
  });
};
