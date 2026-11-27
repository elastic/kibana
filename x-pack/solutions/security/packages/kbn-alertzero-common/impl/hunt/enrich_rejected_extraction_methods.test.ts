/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { REJECTED_EXTRACTION_METHODS, isRejectedExtractionMethod } from './usable_report_filter';
import {
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

interface EnrichStep {
  name?: string;
  steps?: EnrichStep[];
  with?: {
    query?: { bool?: { must_not?: Array<{ terms?: Record<string, string[]> }> } };
    body?: { doc?: { lineage?: { extraction_method?: string } } };
  };
}

const findStep = (steps: EnrichStep[], name: string): EnrichStep | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = findStep(step.steps ?? [], name);
    if (nested) return nested;
  }
  return undefined;
};

// The enrich workflow YAML cannot import REJECTED_EXTRACTION_METHODS, so it repeats the values.
// A value present on one side only would let a rejected report count as extracted, related or
// usable.
describe('enrich workflow rejected extraction methods', () => {
  const definition = getManagedWorkflowDefinition(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID);
  const { steps } = parse(definition?.yaml ?? '') as { steps: EnrichStep[] };

  it.each(['check_already_extracted', 'find_related_reports'])(
    '%s excludes exactly REJECTED_EXTRACTION_METHODS',
    (name) => {
      const mustNot = findStep(steps, name)?.with?.query?.bool?.must_not ?? [];
      const excluded = mustNot.flatMap(
        (clause) => clause.terms?.['lineage.extraction_method'] ?? []
      );

      expect([...excluded].sort()).toEqual([...REJECTED_EXTRACTION_METHODS].sort());
    }
  );

  it('persist_gate_rejection writes a value every reader treats as rejected', () => {
    const written = findStep(steps, 'persist_gate_rejection')?.with?.body?.doc?.lineage
      ?.extraction_method;

    expect(written).toBeDefined();
    expect(isRejectedExtractionMethod(written)).toBe(true);
  });
});
