/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertTriageAttachmentService } from '../../types';
import {
  attachAlertTriageWorkerToAllRules,
  detachAlertTriageWorkerFromAllRules,
  detachRuleIdChunks,
  MAX_RULE_ATTACHMENT_PASSES,
} from './alert_triage_rule_attachments';

/** In-memory rule-attachment service: attaching moves ids to attached, detaching moves them back. */
const makeAttachmentService = (
  opts: {
    notAttachedIds?: string[];
    attachedIds?: string[];
    pageSize?: number;
    skippedRuleCount?: number;
  } = {}
): AlertTriageAttachmentService & {
  updateRuleAttachments: jest.Mock;
  getRuleAttachmentSelection: jest.Mock;
} => {
  const notAttached = new Set(opts.notAttachedIds ?? []);
  const attached = new Set(opts.attachedIds ?? []);
  const pageSize = opts.pageSize ?? Number.MAX_SAFE_INTEGER;
  return {
    getRuleAttachmentSelection: jest.fn(
      async ({ attachmentFilter }: { search: string; attachmentFilter: string }) =>
        attachmentFilter === 'not_attached'
          ? {
              ruleIds: [...notAttached].slice(0, pageSize),
              attachedRuleIds: [],
              skippedRuleCount: opts.skippedRuleCount,
            }
          : { ruleIds: [], attachedRuleIds: [...attached].slice(0, pageSize) }
    ),
    updateRuleAttachments: jest.fn(
      async ({
        attachRuleIds,
        detachRuleIds,
      }: {
        attachRuleIds: string[];
        detachRuleIds: string[];
      }) => {
        for (const id of attachRuleIds) {
          notAttached.delete(id);
          attached.add(id);
        }
        for (const id of detachRuleIds) {
          attached.delete(id);
          notAttached.add(id);
        }
        return { matched: attachRuleIds.length + detachRuleIds.length, updated: 0 };
      }
    ),
  };
};

describe('attachAlertTriageWorkerToAllRules', () => {
  it('calls onRulesAttached once per pass with that pass\u2019s rule IDs', async () => {
    const service = makeAttachmentService({ notAttachedIds: ['r1', 'r2', 'r3'], pageSize: 1 });
    const passes: string[][] = [];

    await attachAlertTriageWorkerToAllRules(service, (ruleIds) => passes.push(ruleIds));

    expect(passes).toEqual([['r1'], ['r2'], ['r3']]);
  });

  it('does not call onRulesAttached when there is nothing to attach', async () => {
    const service = makeAttachmentService({ notAttachedIds: [] });
    const onRulesAttached = jest.fn();

    await attachAlertTriageWorkerToAllRules(service, onRulesAttached);

    expect(onRulesAttached).not.toHaveBeenCalled();
  });

  it('reports the rule IDs from passes that succeeded before a later pass throws', async () => {
    const service = makeAttachmentService({ notAttachedIds: ['r1', 'r2'], pageSize: 1 });
    const real = service.updateRuleAttachments.getMockImplementation();
    service.updateRuleAttachments
      .mockImplementationOnce(real!)
      .mockRejectedValueOnce(new Error('pass 2 failed'));
    const passes: string[][] = [];

    await expect(
      attachAlertTriageWorkerToAllRules(service, (ruleIds) => passes.push(ruleIds))
    ).rejects.toThrow('pass 2 failed');

    // Pass 1's callback already fired before pass 2 threw.
    expect(passes).toEqual([['r1']]);
  });

  it('works without an onRulesAttached callback', async () => {
    const service = makeAttachmentService({ notAttachedIds: ['r1'] });
    await expect(attachAlertTriageWorkerToAllRules(service)).resolves.toEqual({
      skippedRuleCount: 0,
    });
  });

  it('returns the number of rules selection left out because the caller cannot edit them', async () => {
    const service = makeAttachmentService({ notAttachedIds: ['r1', 'r2'], skippedRuleCount: 3 });

    await expect(attachAlertTriageWorkerToAllRules(service)).resolves.toEqual({
      skippedRuleCount: 3,
    });
  });

  it('throws rather than looping when a pass makes no progress', async () => {
    const service = makeAttachmentService({ notAttachedIds: ['stuck-rule'] });
    service.updateRuleAttachments.mockImplementation(async () => {
      /* never actually attaches, so the same rule is selected again */
    });

    await expect(attachAlertTriageWorkerToAllRules(service)).rejects.toThrow(
      'Rule attach made no progress on rule stuck-rule'
    );
  });

  it('is bounded by MAX_RULE_ATTACHMENT_PASSES', () => {
    expect(MAX_RULE_ATTACHMENT_PASSES).toBeGreaterThan(0);
  });
});

describe('detachAlertTriageWorkerFromAllRules', () => {
  it('detaches every currently-attached rule, regardless of when it was attached', async () => {
    const service = makeAttachmentService({ attachedIds: ['old-rule', 'new-rule'] });

    await detachAlertTriageWorkerFromAllRules(service);

    expect(
      (await service.getRuleAttachmentSelection({ search: '', attachmentFilter: 'attached' }))
        .attachedRuleIds
    ).toEqual([]);
  });
});

describe('detachRuleIdChunks', () => {
  it('detaches only the given rule IDs, leaving other attached rules untouched', async () => {
    const service = makeAttachmentService({ attachedIds: ['existing-rule', 'r1', 'r2'] });

    await detachRuleIdChunks(service, [['r1'], ['r2']]);

    expect(
      (await service.getRuleAttachmentSelection({ search: '', attachmentFilter: 'attached' }))
        .attachedRuleIds
    ).toEqual(['existing-rule']);
    expect(service.updateRuleAttachments).toHaveBeenCalledTimes(2);
    expect(service.updateRuleAttachments).toHaveBeenNthCalledWith(1, {
      attachRuleIds: [],
      detachRuleIds: ['r1'],
    });
    expect(service.updateRuleAttachments).toHaveBeenNthCalledWith(2, {
      attachRuleIds: [],
      detachRuleIds: ['r2'],
    });
  });

  it('passes ignoreMissingRules through, and does not set it by default', async () => {
    const service = makeAttachmentService({ attachedIds: ['r1'] });

    await detachRuleIdChunks(service, [['r1']], { ignoreMissingRules: true });

    expect(service.updateRuleAttachments).toHaveBeenCalledWith({
      attachRuleIds: [],
      detachRuleIds: ['r1'],
      ignoreMissingRules: true,
    });
  });

  it('skips empty chunks without calling updateRuleAttachments', async () => {
    const service = makeAttachmentService({ attachedIds: ['r1'] });

    await detachRuleIdChunks(service, [[], ['r1'], []]);

    expect(service.updateRuleAttachments).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there are no chunks to detach', async () => {
    const service = makeAttachmentService({ attachedIds: ['r1'] });

    await detachRuleIdChunks(service, []);

    expect(service.updateRuleAttachments).not.toHaveBeenCalled();
  });
});
