/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Building blocks of the profiling scenarios: frames, call trees, workloads and the sampling of
 * their stack traces. Each scenario defines its own workloads and hosts, so that the data of
 * each schema is easy to tell apart in the UI.
 */

import type {
  RunOptions,
  ProfilingCallTree,
  ProfilingFrame,
  ProfilingStackTrace,
} from '@kbn/synthtrace';
import { createProfilingStackTraces } from '@kbn/synthtrace';
import { FrameType } from '@kbn/profiling-utils';

// Live mode generates one 1s bucket at a time and an interval emits at the start of each bucket,
// so longer intervals would be emitted on every bucket. Ticking every second keeps the rates right.
export const TICK_INTERVAL = '1s';
const TICK_INTERVAL_MS = 1_000;
const HOST_REPORT_INTERVAL_MS = 60_000;

/** Number of times per second the agent samples each CPU core. */
export const AGENT_SAMPLING_FREQUENCY = 20;

const DEFAULT_HOSTS = 3;
// A host with one busy CPU core.
const DEFAULT_SAMPLES_PER_SECOND = AGENT_SAMPLING_FREQUENCY;

export const native = (executable: string, functionName: string): ProfilingFrame => ({
  type: FrameType.Native,
  executable,
  functionName,
});

export const kernel = (functionName: string): ProfilingFrame => ({
  type: FrameType.Kernel,
  executable: 'vmlinux',
  functionName,
});

export const go = (
  executable: string,
  fileName: string,
  functionName: string,
  lineNumber: number
): ProfilingFrame => ({ type: FrameType.Go, executable, fileName, functionName, lineNumber });

const interpreted =
  (type: FrameType) =>
  (fileName: string, functionName: string, lineNumber: number): ProfilingFrame => ({
    type,
    fileName,
    functionName,
    lineNumber,
  });

export const jvm = interpreted(FrameType.JVM);
export const python = interpreted(FrameType.Python);
export const javaScript = interpreted(FrameType.JavaScript);
export const dotNet = interpreted(FrameType.DotNET);

export const calls = (
  frame: ProfilingFrame,
  selfWeight: number,
  children: ProfilingCallTree[] = []
): ProfilingCallTree => ({ frame, selfWeight, children });

export interface ProfilingWorkload {
  threads: string[];
  callTree: ProfilingCallTree;
  serviceName?: string;
  executable?: string;
}

export interface ProfilingSample {
  workload: ProfilingWorkload;
  stackTrace: ProfilingStackTrace;
  threadName: string;
}

interface WeightedStackTrace {
  workload: ProfilingWorkload;
  stackTrace: ProfilingStackTrace;
  cumulativeWeight: number;
}

export interface ProfilingScenarioOptions {
  hostCount: number;
  samplesPerSecond: number;
}

export const getProfilingScenarioOptions = (
  scenarioOpts: RunOptions['scenarioOpts']
): ProfilingScenarioOptions => {
  const { hosts = DEFAULT_HOSTS, samplesPerSecond = DEFAULT_SAMPLES_PER_SECOND } =
    scenarioOpts ?? {};

  return { hostCount: Number(hosts), samplesPerSecond: Number(samplesPerSecond) };
};

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** Samples the stack traces of the workloads, proportionally to their weights. */
export class ProfilingSampler {
  private readonly weightedStackTraces: WeightedStackTrace[];

  constructor(workloads: ProfilingWorkload[]) {
    let cumulativeWeight = 0;

    this.weightedStackTraces = workloads.flatMap((workload) =>
      createProfilingStackTraces(workload.callTree).map((stackTrace) => {
        cumulativeWeight += stackTrace.weight;
        return { workload, stackTrace, cumulativeWeight };
      })
    );
  }

  getStackTraces(): ProfilingStackTrace[] {
    return this.weightedStackTraces.map(({ stackTrace }) => stackTrace);
  }

  sample(count: number): ProfilingSample[] {
    const totalWeight =
      this.weightedStackTraces[this.weightedStackTraces.length - 1].cumulativeWeight;

    return Array.from({ length: count }, () => {
      const target = Math.random() * totalWeight;
      const { workload, stackTrace } =
        this.weightedStackTraces.find(({ cumulativeWeight }) => target < cumulativeWeight) ??
        this.weightedStackTraces[0];

      return { workload, stackTrace, threadName: pickRandom(workload.threads) };
    });
  }
}

export const isFirstTickOfHostReportInterval = (timestamp: number): boolean =>
  Math.floor(timestamp / HOST_REPORT_INTERVAL_MS) !==
  Math.floor((timestamp - TICK_INTERVAL_MS) / HOST_REPORT_INTERVAL_MS);
