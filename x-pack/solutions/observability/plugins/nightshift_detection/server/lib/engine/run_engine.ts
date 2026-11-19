/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Logger as CoreLogger } from '@kbn/core-di';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { inject, injectable } from 'inversify';
import { getErrorMessage } from '../errors/get_error_message';
import { AvailabilityService } from '../availability/availability_service';
import { DetectionSignalStore } from '../signals/signal_store';
import { wrapReading } from '../signals/wrap_reading';
import { DetectionStateClient } from '../state/detection_state_client';
import { StrategyCatalog } from '../strategies/strategy_catalog';
import type { GenerateResult } from '../strategies/types';
import { DetectionEngineDataClient } from './es_client_tokens';
import { planWindows } from './plan_windows';
import type { PlannedWindow } from './plan_windows';
import { SpaceRunLock } from './space_run_lock';
import type { StrategyRunResult, TickResult } from './tick_result';
import { EnabledSources, RunContext } from './tokens';

/**
 * Time one tick has for all its generators together. A generator past it is aborted. JavaScript
 * cannot kill one that ignores the signal: it runs on after the tick returns, but the runner
 * stores nothing from it once the run has ended.
 */
export const RUN_BUDGET_MS = 4 * 60_000;

function assertRunOpen(runSignal: AbortSignal): void {
  if (runSignal.aborted) {
    throw new Error('the run ended before the result could be stored');
  }
}

/** Rejects when the signal aborts, so a generator that ignores its signal cannot hold the run. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = () => reject(new Error(String(signal.reason ?? 'aborted')));
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener('abort', fail, { once: true });
  });
}

/**
 * One tick of the detection engine in one space: takes the space's run lock, runs every due
 * strategy over its window, stores the signals, and moves each strategy's generator state. It knows no
 * identity: the clients and the tick's context are injected, so the `_tick` route decides who the
 * tick runs as.
 */
@injectable()
export class EngineRunner {
  constructor(
    @inject(RunContext) private readonly runContext: RunContext,
    @inject(AvailabilityService)
    private readonly availability: Pick<AvailabilityService, 'isAvailable'>,
    @inject(StrategyCatalog) private readonly catalog: StrategyCatalog,
    @inject(DetectionStateClient) private readonly state: DetectionStateClient,
    @inject(SpaceRunLock) private readonly spaceRunLock: Pick<SpaceRunLock, 'run'>,
    @inject(DetectionSignalStore) private readonly signalStore: DetectionSignalStore,
    @inject(EnabledSources) private readonly enabledSources: EnabledSources,
    @inject(DetectionEngineDataClient) private readonly dataClient: ElasticsearchClient,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Runs one tick:
   * 1. Check the engine is available for this deployment.
   * 2. Take the space's run lock, or report that another run holds it.
   * 3. Plan a window for every strategy that is due.
   * 4. Run the due strategies in parallel within the run budget.
   * 5. Store each strategy's signals and move its generator state when nothing was lost.
   * 6. Triage and lifecycle (not built yet).
   * 7. Release the run lock.
   *
   * Strategies that are not due are left out of the result. A strategy that fails or runs out of
   * time is reported and keeps its generator state, so the next tick reads its window again; the others
   * are not affected.
   */
  public async run({
    now,
    skipBacklog = false,
    abortSignal,
  }: {
    now: number;
    skipBacklog?: boolean;
    abortSignal?: AbortSignal;
  }): Promise<TickResult> {
    const { runId, spaceId } = this.runContext;

    // 1. Availability: nothing is read or written while the engine is off for this deployment.
    if (!(await this.availability.isAvailable())) {
      return { run_id: runId, status: 'unavailable', strategies: [] };
    }

    // 2. One run per space at a time. The lock is released when the callback ends, however it ends.
    const outcome = await this.spaceRunLock.run({
      spaceId,
      callback: () => this.runLocked({ now, skipBacklog, abortSignal }),
    });

    return outcome.ran ? outcome.result : { run_id: runId, status: 'busy', strategies: [] };
  }

  private async runLocked({
    now,
    skipBacklog,
    abortSignal,
  }: {
    now: number;
    skipBacklog: boolean;
    abortSignal?: AbortSignal;
  }): Promise<TickResult> {
    const { runId, spaceId } = this.runContext;
    const budget = new AbortController();
    const budgetTimer = setTimeout(() => budget.abort('the run budget is spent'), RUN_BUDGET_MS);
    const abortRun = () => budget.abort(abortSignal?.reason ?? 'the run was aborted');
    abortSignal?.addEventListener('abort', abortRun, { once: true });
    if (abortSignal?.aborted) {
      abortRun();
    }

    try {
      // 3. What is due: the generator state per strategy, then a window per due strategy.
      const strategies = this.catalog.list();
      const processedUntil = await this.state.readGeneratorStates({
        spaceId,
        strategyIds: strategies.map(({ descriptor }) => descriptor.id),
      });
      const windows = planWindows({ strategies, processedUntil, now, skipBacklog });

      // 4 and 5. Every due strategy runs on its own; one failing does not stop the others.
      const sources = windows.length > 0 ? await this.enabledSources.list() : [];
      const results = await Promise.all(
        windows.map((window) => this.runStrategy({ window, sources, runSignal: budget.signal }))
      );

      await this.triageAndLifecycle(results);

      return { run_id: runId, status: 'completed', strategies: results };
    } finally {
      clearTimeout(budgetTimer);
      abortSignal?.removeEventListener('abort', abortRun);
      // Ends the run for a generator that ignores its signal and comes back after the lock is free.
      budget.abort('the run ended');
    }
  }

  /**
   * Triage and lifecycle run here, after the signals are stored: nightshift-program#2080 and
   * #2084 fill this in. Called on every tick so the later phases need no change to the loop.
   */
  private async triageAndLifecycle(_results: StrategyRunResult[]): Promise<void> {}

  private async runStrategy({
    window,
    sources,
    runSignal,
  }: {
    window: PlannedWindow;
    sources: NightshiftSource[];
    runSignal: AbortSignal;
  }): Promise<StrategyRunResult> {
    const { spaceId, scheduledMinute } = this.runContext;
    const { strategy, from, to, skipped_minutes: skippedMinutes } = window;
    const strategyId = strategy.descriptor.id;
    const notes: string[] = [];
    const result: StrategyRunResult = {
      id: strategyId,
      from,
      to,
      signals: 0,
      skipped_minutes: skippedMinutes,
      notes,
    };

    // Its own controller, so the strategy can be aborted without touching the others.
    const controller = new AbortController();
    const abortStrategy = () => controller.abort(runSignal.reason);
    runSignal.addEventListener('abort', abortStrategy, { once: true });
    if (runSignal.aborted) {
      abortStrategy();
    }

    try {
      const generated: GenerateResult = await Promise.race([
        strategy.generator.generate({
          spaceId,
          sources,
          window: { from, to },
          esClient: this.dataClient,
          history: {
            readHistory: ({ series, from: historyFrom, to: historyTo }) =>
              this.signalStore.readHistory({
                spaceId,
                strategy: strategyId,
                strategyVersion: strategy.descriptor.version,
                series,
                from: historyFrom,
                to: historyTo,
              }),
          },
          abortSignal: controller.signal,
          logger: this.logger,
        }),
        rejectOnAbort(controller.signal),
      ]);
      notes.push(...generated.notes);
      if (generated.truncated) {
        // The same cap would cut the same window again, so the generator state still moves.
        notes.push(`${strategyId}: reading stopped at a cap, so the window is partly covered`);
      }

      const signals = generated.readings.flatMap((reading) => {
        const wrapped = wrapReading({
          reading,
          strategyId,
          strategyVersion: strategy.descriptor.version,
          spaceId,
          scheduledMinute,
        });
        if (wrapped.dropped) {
          notes.push(wrapped.note);
          return [];
        }
        return [wrapped.signal];
      });

      // A generator that ignores its abort signal can come back after the run ended, when the lock
      // is free and another node may be running this space. Nothing is stored or advanced from here.
      assertRunOpen(runSignal);

      const { written, failures } = await this.signalStore.write(signals);
      result.signals = written;

      if (failures.length > 0) {
        // Reading the window again would write the signals that did go in a second time, but a
        // lost signal cannot be recovered later.
        notes.push(
          ...failures.map(
            ({ fingerprint, reason }) => `${strategyId}: could not store ${fingerprint}: ${reason}`
          )
        );
        result.error = `${failures.length} signal(s) could not be stored`;
        return result;
      }

      assertRunOpen(runSignal);
      await this.state.advanceGeneratorState({ spaceId, strategyId, processedUntil: to });
    } catch (error) {
      result.error = getErrorMessage(error);
      this.logger.warn(`Strategy ${strategyId} failed in space ${spaceId}: ${result.error}`);
    } finally {
      runSignal.removeEventListener('abort', abortStrategy);
    }

    return result;
  }
}
