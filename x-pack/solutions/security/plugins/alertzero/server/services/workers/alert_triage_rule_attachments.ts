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
  direction: 'attach' | 'detach',
  // Fires once per successful pass, before the next pass starts — including when a later pass
  // throws. Lets a caller compensate exactly the rule IDs *this call* touched (see
  // attachAlertTriageWorkerToAllRules) rather than only learning about progress once the whole
  // operation resolves.
  onPassComplete?: (ruleIds: string[]) => void
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
    onPassComplete?.(ruleIds);
  }
  throw new Error(`Rule ${direction} did not finish within ${MAX_RULE_ATTACHMENT_PASSES} passes`);
};

/**
 * Attaches the Alert Triage Worker to every detection rule that does not carry it yet.
 *
 * `onRulesAttached`, if given, fires once per pass with the rule IDs that pass just attached —
 * even if a later pass throws. A caller that needs to roll back a partial failure should record
 * these IDs and compensate only them via `detachRuleIdChunks`, rather than
 * `detachAlertTriageWorkerFromAllRules`: the latter detaches every currently-attached rule,
 * including ones attached before this call (e.g. by a previous enable), which a rollback must
 * leave untouched.
 */
export const attachAlertTriageWorkerToAllRules = (
  service: AlertTriageAttachmentService,
  onRulesAttached?: (ruleIds: string[]) => void
): Promise<void> => runPasses(service, 'attach', onRulesAttached);

/** Detaches the Alert Triage Worker from every detection rule that carries it. */
export const detachAlertTriageWorkerFromAllRules = (
  service: AlertTriageAttachmentService
): Promise<void> => runPasses(service, 'detach');

/**
 * Detaches exactly the given rule IDs, in the same page-sized chunks they were originally
 * attached in (each chunk is a prior `attachAlertTriageWorkerToAllRules` pass's `onRulesAttached`
 * call), so a rollback never sends more IDs to `updateRuleAttachments` in one call than the
 * attach side already proved it can handle.
 */
export const detachRuleIdChunks = async (
  service: AlertTriageAttachmentService,
  ruleIdChunks: string[][]
): Promise<void> => {
  for (const chunk of ruleIdChunks) {
    if (chunk.length === 0) continue;
    await service.updateRuleAttachments({ attachRuleIds: [], detachRuleIds: chunk });
  }
};
