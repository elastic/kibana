/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation } from '@langchain/langgraph';
import type { Alert, TriageResult, MitreMapping } from '../../types';

/**
 * Investigation Graph State
 *
 * Maintains state as investigation progresses through agents:
 * 1. Start with alert + caseId
 * 2. Triage agent adds triage result
 * 3. MITRE mapper adds MITRE mapping
 * 4. Final node formats result for case
 */
export const getInvestigationGraphAnnotation = () =>
  Annotation.Root({
    /** Input alert to investigate */
    alert: Annotation<Alert>({
      reducer: (x: Alert, y?: Alert) => y ?? x,
    }),

    /** Case ID to attach investigation results to */
    caseId: Annotation<string | undefined>({
      reducer: (x: string | undefined, y?: string | undefined) => y ?? x,
      default: () => undefined,
    }),

    /** Triage result from Triage Agent */
    triage: Annotation<TriageResult | undefined>({
      reducer: (x: TriageResult | undefined, y?: TriageResult | undefined) => y ?? x,
      default: () => undefined,
    }),

    /** MITRE mapping from MITRE Mapper Agent */
    mitreMapping: Annotation<MitreMapping | undefined>({
      reducer: (x: MitreMapping | undefined, y?: MitreMapping | undefined) => y ?? x,
      default: () => undefined,
    }),

    /** CTI context from CTI Enrichment Agent */
    ctiContext: Annotation<any>({
      reducer: (x: any, y?: any) => y ?? x,
      default: () => undefined,
    }),

    /** Investigation analysis from Investigation Agent */
    investigation: Annotation<any>({
      reducer: (x: any, y?: any) => y ?? x,
      default: () => undefined,
    }),

    /** Remediation recommendations from Remediation Agent */
    remediation: Annotation<any>({
      reducer: (x: any, y?: any) => y ?? x,
      default: () => undefined,
    }),

    /** Per-agent latency tracking */
    agentLatencies: Annotation<Record<string, number>>({
      reducer: (x: Record<string, number>, y?: Record<string, number>) => ({ ...x, ...y }),
      default: () => ({}),
    }),

    /** Accumulated errors (if any agent fails) */
    errors: Annotation<string[]>({
      reducer: (x: string[], y?: string[]) => (y ? [...x, ...y] : x),
      default: () => [],
    }),

    /** Investigation start time (for latency tracking) */
    startTime: Annotation<number>({
      reducer: (x: number, y?: number) => y ?? x,
      default: () => Date.now(),
    }),
  });

export type InvestigationGraphState = ReturnType<typeof getInvestigationGraphAnnotation.State>;
