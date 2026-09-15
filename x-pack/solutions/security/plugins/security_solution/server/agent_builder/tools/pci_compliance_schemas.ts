/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { PCI_REQUIREMENTS } from './pci_compliance_requirements';

/**
 * Allowed index-pattern shape. Elasticsearch index names disallow the characters
 * \ / ? " < > | , #, and we additionally disallow whitespace and any control character
 * to prevent attempts to inject a second FROM clause. Wildcards (*) are allowed because
 * data streams such as `logs-*` rely on them. Cross-cluster patterns using `:` are allowed.
 *
 * Because the FROM clause of an ES|QL query cannot be parameterised, this regex is the
 * security boundary for any value that ultimately flows into `FROM <pattern>` — treat it
 * with the same care as a SQL prepared-statement table whitelist.
 */
const INDEX_PATTERN_REGEX = /^[a-z0-9][a-z0-9._+\-*:]{0,254}$/i;

export const pciIndexPatternSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(
    INDEX_PATTERN_REGEX,
    'Index pattern may only contain letters, digits, and the characters . _ + - * : and must start with a letter or digit.'
  );

/**
 * Strict ISO-8601 time-range validation. ES|QL ingests these via parameter binding
 * (?_tstart / ?_tend), but tightening here still gives the LLM clear, early feedback
 * when it fabricates a time range.
 */
export const pciTimeRangeSchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .refine((value) => new Date(value.from) <= new Date(value.to), {
    message: '`from` must be earlier than or equal to `to`.',
  });

/**
 * Closed union of PCI DSS requirement identifiers — derived from {@link PCI_REQUIREMENTS}
 * so we cannot drift from the implementation. `"all"` selects every requirement.
 */
const requirementLiterals = [
  'all',
  ...(Object.keys(PCI_REQUIREMENTS) as Array<keyof typeof PCI_REQUIREMENTS>),
] as const;

export const pciRequirementIdSchema = z.enum(
  requirementLiterals as unknown as readonly [string, ...string[]]
);

export type PciRequirementIdInput = z.infer<typeof pciRequirementIdSchema>;

/**
 * Reusable scope-claim shape attached to every PCI tool response. Agents must cite this
 * back in natural-language answers so downstream users can verify what was actually
 * evaluated and where the QSA still needs to act.
 */
export const PCI_DSS_VERSION = '4.0.1' as const;

export const PCI_AUTOMATED_ASSESSMENT_DISCLAIMER =
  'Automated PCI DSS telemetry assessment only. Formal compliance determination requires a ' +
  'Qualified Security Assessor (QSA) and process-level verification. Use these findings as ' +
  'input to, not a replacement for, a scoped PCI DSS audit.';

export interface PciScopeClaim {
  pciDssVersion: typeof PCI_DSS_VERSION;
  indices: string[];
  timeRange: { from: string; to: string };
  requirementsEvaluated: string[];
  requiredFieldsChecked: string[];
  disclaimer: typeof PCI_AUTOMATED_ASSESSMENT_DISCLAIMER;
}

export interface BuildScopeClaimArgs {
  indices: string[];
  from: string;
  to: string;
  requirementsEvaluated: string[];
  requiredFieldsChecked: string[];
}

export const buildScopeClaim = ({
  indices,
  from,
  to,
  requirementsEvaluated,
  requiredFieldsChecked,
}: BuildScopeClaimArgs): PciScopeClaim => ({
  pciDssVersion: PCI_DSS_VERSION,
  indices,
  timeRange: { from, to },
  requirementsEvaluated: [...new Set(requirementsEvaluated)].sort(),
  requiredFieldsChecked: [...new Set(requiredFieldsChecked)].sort(),
  disclaimer: PCI_AUTOMATED_ASSESSMENT_DISCLAIMER,
});
