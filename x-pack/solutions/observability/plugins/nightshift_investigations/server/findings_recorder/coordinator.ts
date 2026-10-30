/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecorderTurn } from './messages';

const MAX_TRACKED_CONVERSATIONS = 500;

interface ConversationState {
  /** The next pass takes this ticket. */
  nextTicket: number;
  /** The highest ticket that has written. A pass with a lower ticket is stale. */
  lastWrittenTicket: number;
  /** The live pass in flight, if any. */
  live?: { done: Promise<void>; abort: AbortController };
  /** Set once the final pass has taken over: no live pass may start or write after it. */
  finalized: boolean;
  /** The recorder's earlier answers, replayed in its conversation. */
  turns: RecorderTurn[];
}

/** What the recorder remembers of one investigation across its passes. */
export interface RecorderMemory {
  turns: () => RecorderTurn[];
  remember: (turn: RecorderTurn) => void;
}

export interface PassGuard {
  signal: AbortSignal;
  /** True while this pass is the newest and may write. Records the write when it returns true. */
  claimWrite: () => boolean;
}

/**
 * Orders the recorder's passes for each investigation, so a slow live pass can never overwrite
 * the final one. At most one live pass runs at a time; the final pass aborts it, waits for it to
 * settle and takes the highest ticket; a write from a lower ticket is dropped.
 */
export class FindingsCoordinator {
  private readonly states = new Map<string, ConversationState>();

  private state(conversationId: string): ConversationState {
    let state = this.states.get(conversationId);
    if (!state) {
      if (this.states.size >= MAX_TRACKED_CONVERSATIONS) {
        const oldest = this.states.keys().next().value;
        if (oldest !== undefined) this.states.delete(oldest);
      }
      state = { nextTicket: 1, lastWrittenTicket: 0, finalized: false, turns: [] };
      this.states.set(conversationId, state);
    }
    return state;
  }

  private guardFor(
    state: ConversationState,
    signal: AbortSignal,
    { ignoreAbort = false }: { ignoreAbort?: boolean } = {}
  ): PassGuard {
    const ticket = state.nextTicket++;
    return {
      signal,
      claimWrite: () => {
        // The final pass is the newest, so its own timeout stops the model call but must not
        // stop it recording the fallback. A live pass that was aborted is stale: it must not write.
        if ((signal.aborted && !ignoreAbort) || ticket < state.lastWrittenTicket) return false;
        state.lastWrittenTicket = ticket;
        return true;
      },
    };
  }

  /** The recorder's earlier answers for an investigation, oldest first. */
  memory(conversationId: string): RecorderMemory {
    return {
      turns: () => [...this.state(conversationId).turns],
      remember: (turn) => {
        this.state(conversationId).turns.push(turn);
      },
    };
  }

  /**
   * Starts a live pass without waiting for it. Returns false, and starts nothing, when one is
   * already running or the final pass has taken over.
   */
  startLive({
    conversationId,
    executionSignal,
    timeoutMs,
    run,
  }: {
    conversationId: string;
    executionSignal: AbortSignal;
    timeoutMs: number;
    run: (guard: PassGuard) => Promise<unknown>;
  }): boolean {
    const state = this.state(conversationId);
    if (state.live || state.finalized) return false;

    const abort = new AbortController();
    const onExecutionAbort = () => abort.abort();
    executionSignal.addEventListener('abort', onExecutionAbort, { once: true });
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    timer.unref?.();

    const guard = this.guardFor(state, abort.signal);
    const done = run(guard)
      .then(
        () => undefined,
        () => undefined
      )
      .finally(() => {
        clearTimeout(timer);
        executionSignal.removeEventListener('abort', onExecutionAbort);
        if (state.live?.done === done) state.live = undefined;
      });
    state.live = { done, abort };
    return true;
  }

  /**
   * Runs the final pass: stops the live pass, waits for it to settle, then runs with the newest
   * ticket. The state is released afterwards, since the investigation round is over.
   */
  async runFinal<T>({
    conversationId,
    timeoutMs,
    run,
  }: {
    conversationId: string;
    timeoutMs: number;
    run: (guard: PassGuard) => Promise<T>;
  }): Promise<T> {
    const state = this.state(conversationId);
    state.finalized = true;
    if (state.live) {
      state.live.abort.abort();
      await state.live.done;
    }

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    timer.unref?.();
    try {
      return await run(this.guardFor(state, abort.signal, { ignoreAbort: true }));
    } finally {
      clearTimeout(timer);
      this.states.delete(conversationId);
    }
  }

  /** Drops what is tracked for an investigation whose execution ended without a final pass. */
  release(conversationId: string): void {
    const state = this.states.get(conversationId);
    state?.live?.abort.abort();
    this.states.delete(conversationId);
  }
}
