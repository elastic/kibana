/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorContext } from './audit_context';
import { buildEmulationComment } from './audit_logger';

describe('buildEmulationComment', () => {
  // ─── Baseline: no actor / no user comment ───────────────────────────────────

  it('builds the canonical "Detection Emulation [<id>]: <command>" shape', () => {
    expect(buildEmulationComment('emu-1', 'isolate')).toBe('Detection Emulation [emu-1]: isolate');
  });

  it('appends the user comment with " - " separator when supplied', () => {
    expect(buildEmulationComment('emu-1', 'isolate', 'rule validation')).toBe(
      'Detection Emulation [emu-1]: isolate - rule validation'
    );
  });

  // ─── actor: 'user' ──────────────────────────────────────────────────────────

  it('emits no actor suffix when actor.kind === "user"', () => {
    const actor: ActorContext = { kind: 'user' };
    expect(buildEmulationComment('emu-1', 'isolate', undefined, actor)).toBe(
      'Detection Emulation [emu-1]: isolate'
    );
  });

  it('still appends the user comment when actor.kind === "user"', () => {
    const actor: ActorContext = { kind: 'user' };
    expect(buildEmulationComment('emu-1', 'isolate', 'note', actor)).toBe(
      'Detection Emulation [emu-1]: isolate - note'
    );
  });

  // ─── actor: 'agent-builder' — full and partial ID coverage ──────────────────

  it('emits a complete via=agent-builder suffix when all IDs are present', () => {
    const actor: ActorContext = {
      kind: 'agent-builder',
      conversationId: 'conv-1',
      executionId: 'exec-1',
      runId: 'run-1',
      toolCallId: 'tool-call-1',
    };
    expect(buildEmulationComment('emu-1', 'isolate', undefined, actor)).toBe(
      'Detection Emulation [emu-1]: isolate [via=agent-builder conv=conv-1 exec=exec-1 run=run-1 tool-call=tool-call-1]'
    );
  });

  it('omits absent IDs from the suffix', () => {
    const actor: ActorContext = {
      kind: 'agent-builder',
      runId: 'run-1',
      toolCallId: 'tool-call-1',
    };
    expect(buildEmulationComment('emu-1', 'execute', undefined, actor)).toBe(
      'Detection Emulation [emu-1]: execute [via=agent-builder run=run-1 tool-call=tool-call-1]'
    );
  });

  it('emits via=agent-builder alone when no IDs are present', () => {
    const actor: ActorContext = { kind: 'agent-builder' };
    expect(buildEmulationComment('emu-1', 'isolate', undefined, actor)).toBe(
      'Detection Emulation [emu-1]: isolate [via=agent-builder]'
    );
  });

  it('preserves the user comment ordering: <user comment> then [<actor suffix>]', () => {
    const actor: ActorContext = {
      kind: 'agent-builder',
      conversationId: 'conv-1',
    };
    expect(buildEmulationComment('emu-1', 'isolate', 'rule validation', actor)).toBe(
      'Detection Emulation [emu-1]: isolate - rule validation [via=agent-builder conv=conv-1]'
    );
  });
});
