/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError } from '../errors/security_error';
import {
  getSignificantEventsUserPrivileges,
  type GetUserPrivilegesArgs,
} from './get_user_privileges';

/** Throws a 403 unless the requester can write knowledge indicators (onboarding). */
export const assertCanWriteKnowledgeIndicators = async (
  args: GetUserPrivilegesArgs
): Promise<void> => {
  const { knowledgeIndicators } = await getSignificantEventsUserPrivileges(args);
  if (!knowledgeIndicators.write) {
    throw new SecurityError(
      'You do not have permission to generate knowledge indicators for this deployment.'
    );
  }
};

/** Throws a 403 unless the requester can write significant events (discovery). */
export const assertCanWriteSignificantEvents = async (
  args: GetUserPrivilegesArgs
): Promise<void> => {
  const { significantEvents } = await getSignificantEventsUserPrivileges(args);
  if (!significantEvents.write) {
    throw new SecurityError(
      'You do not have permission to run significant events discovery for this deployment.'
    );
  }
};
