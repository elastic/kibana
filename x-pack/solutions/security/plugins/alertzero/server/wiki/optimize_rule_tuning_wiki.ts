/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic AlertZero wiki optimizer for Rule Tuning. Product-owned: maps a
 * diagnosis + gate outcome into wiki edits. No LLM; merges are left for a later revision.
 */

export interface RuleTuningWikiDiagnosis {
  change_type?: string;
  reasoning?: string;
  fp_pattern?: string;
  exception_entries?: unknown[];
  proposed_query?: string;
}

export interface RuleTuningWikiEdit {
  action: 'upsert' | 'corroborate' | 'archive';
  entity_type: string;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  status?: 'established' | 'tentative' | 'archived';
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Builds wiki edits from a Rule Tuning diagnosis and gate outcome.
 * Approved → establish Known benign / Do not exclude content on the detection_rule page.
 * Rejected → archive a tentative claim that asserted the rejected exclusion.
 * Expired → no content writes.
 */
export const optimizeRuleTuningWiki = ({
  ruleName,
  ruleId,
  diagnosis,
  gateOutcome,
}: {
  ruleName: string;
  ruleId: string;
  diagnosis: RuleTuningWikiDiagnosis;
  gateOutcome: 'approved' | 'rejected' | 'expired';
}): { edits: RuleTuningWikiEdit[] } => {
  if (gateOutcome === 'expired') {
    return { edits: [] };
  }

  const slug = slugify(ruleName) || slugify(ruleId) || 'unknown-rule';
  const title = ruleName.trim() || ruleId;

  if (gateOutcome === 'rejected') {
    if (diagnosis.change_type !== 'exception' && diagnosis.change_type !== 'query') {
      return { edits: [] };
    }
    return {
      edits: [
        {
          action: 'archive',
          entity_type: 'detection_rule',
          slug,
          title,
        },
      ],
    };
  }

  // approved
  const knownBenign =
    diagnosis.fp_pattern?.trim() ||
    (diagnosis.change_type === 'exception'
      ? 'Analyst-approved exception for recurring false positives.'
      : undefined);
  const doNotExclude =
    diagnosis.change_type === 'exception'
      ? undefined
      : 'Do not broaden exclusions without a fresh review of alert evidence.';

  const sections = [
    '## Detects',
    diagnosis.reasoning?.trim() || '_Diagnosis recorded after an approved tuning proposal._',
    '',
    '## Data',
    `_Rule id: \`${ruleId}\`_`,
    '',
    '## Known benign',
    knownBenign ? `- ${knownBenign}` : '_None recorded yet._',
    '',
    '## Do not exclude',
    doNotExclude ? `- ${doNotExclude}` : '_None recorded yet._',
    '',
    '## Related links',
    '_None yet._',
  ];

  return {
    edits: [
      {
        action: 'upsert',
        entity_type: 'detection_rule',
        slug,
        title,
        description: diagnosis.fp_pattern?.slice(0, 500),
        content: sections.join('\n'),
        status: 'established',
      },
    ],
  };
};
