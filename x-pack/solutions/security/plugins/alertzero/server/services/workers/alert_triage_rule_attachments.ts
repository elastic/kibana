/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTriageAttachmentService } from '../../types';

/**
 * Selection returns at most one bounded page of matching rules per call (2000 today), so
 * covering every rule takes repeated passes. Bounded so a pass that makes no progress cannot
 * spin forever.
 */
export const MAX_RULE_ATTACHMENT_PASSES = 50;

const runPasses = async (
  service: AlertTriageAttachmentService,
  direction: 'attach' | 'detach'
): Promise<void> => {
  let previousFirstId: string | undefined;
  for (let pass = 0; pass < MAX_RULE_ATTACHMENT_PASSES; pass++) {
    const selection = await service.getRuleAttachmentSelection({
      search: '',
      attachmentFilter: direction === 'attach' ? 'not_attached' : 'attached',
    });
    const ruleIds = direction === 'attach' ? selection.ruleIds : selection.attachedRuleIds;
    if (ruleIds.length === 0) return;
    if (ruleIds[0] === previousFirstId) {
      throw new Error(`Rule ${direction} made no progress on rule ${previousFirstId}`);
    }
    previousFirstId = ruleIds[0];
    await service.updateRuleAttachments({
      attachRuleIds: direction === 'attach' ? ruleIds : [],
      detachRuleIds: direction === 'detach' ? ruleIds : [],
    });
  }
  throw new Error(`Rule ${direction} did not finish within ${MAX_RULE_ATTACHMENT_PASSES} passes`);
};

/** Attaches the Alert Triage Worker to every detection rule that does not carry it yet. */
export const attachAlertTriageWorkerToAllRules = (
  service: AlertTriageAttachmentService
): Promise<void> => runPasses(service, 'attach');

/** Detaches the Alert Triage Worker from every detection rule that carries it. */
export const detachAlertTriageWorkerFromAllRules = (
  service: AlertTriageAttachmentService
): Promise<void> => runPasses(service, 'detach');
