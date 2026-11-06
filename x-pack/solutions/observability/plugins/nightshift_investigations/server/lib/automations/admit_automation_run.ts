/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import {
  isScheduleOnlyAutomation,
  MANUAL_AUTOMATION_TRIGGER_SOURCE,
} from '../../../common/automation_run';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { GetAutomationsSoClient } from '../../routes/types';
import type { NightshiftAutomationAttributes } from './types';

type AutomationRunAdmission =
  | { allowed: false; skipReason: 'automation_disabled' }
  | { allowed: true; automation: NightshiftAutomationAttributes; isManualRun: boolean };

/** Checks current automation state before any investigation or recovery work. */
export const admitAutomationRun = async ({
  automationId,
  workflowId,
  triggeredBy,
  request,
  spaceId,
  getAutomationsSoClient,
}: {
  automationId: string;
  workflowId: string;
  triggeredBy: string | undefined;
  request: KibanaRequest;
  spaceId: string;
  getAutomationsSoClient: GetAutomationsSoClient;
}): Promise<AutomationRunAdmission> => {
  const { attributes: automation } = await getAutomationsSoClient(
    request,
    spaceId
  ).get<NightshiftAutomationAttributes>(NIGHTSHIFT_AUTOMATION_SO_TYPE, automationId);
  if (automation.workflowId !== workflowId) {
    throw new Error('The automation does not belong to this workflow.');
  }
  // Only server code can set this source; public workflow inputs and metadata cannot grant it.
  const isManualRun = triggeredBy === MANUAL_AUTOMATION_TRIGGER_SOURCE;
  if (isManualRun && !isScheduleOnlyAutomation(automation)) {
    throw badRequest(
      'Only automations with a schedule trigger and no other triggers can be run manually.'
    );
  }
  if (!automation.isEnabled && !isManualRun) {
    return { allowed: false, skipReason: 'automation_disabled' };
  }
  return { allowed: true, automation, isManualRun };
};
