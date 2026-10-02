/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import {
  significantSecurityEventAttachmentDataSchema,
  type SignificantSecurityEventAttachmentData,
} from '../../../common/significant_security_event_schema';
import { createReadonlyAttachmentType } from './create_readonly_attachment_type';

export const SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID =
  ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent;

/**
 * Characters each list section may spend. Every list in this payload is bounded by the schema
 * in item count but not in size — 50 evidence items of 2000 characters each is a valid
 * `evidence_for` — and at those bounds the whole representation runs past 900K characters.
 * `maxContentLength` alone cannot cover that: it cuts the string at one point, so the sections
 * that happen to come last (evidence, the proposal, the evaluation record) are dropped in
 * full, mid-entry, with nothing in the text saying they existed. Spending the budget per
 * section instead keeps every section present and names what it left out.
 *
 * Sized so the sum of all sections, plus one over-budget item each and the fixed header,
 * stays inside `maxContentLength`. Real payloads carry short items and never reach it.
 */
const SECTION_CHAR_BUDGET = 8_000;

/**
 * Appends `items` until the section budget is spent, then names how many it left out. Always
 * emits at least one item, so a single over-long entry still reaches the agent.
 */
const pushBoundedSection = <T>(
  lines: string[],
  items: readonly T[],
  render: (item: T) => string
): void => {
  let spent = 0;
  let shown = 0;
  for (const item of items) {
    const line = render(item);
    if (shown > 0 && spent + line.length > SECTION_CHAR_BUDGET) {
      break;
    }
    lines.push(line);
    spent += line.length + 1;
    shown += 1;
  }
  if (shown < items.length) {
    lines.push(`  … ${items.length - shown} more not shown (section size limit reached)`);
  }
};

/** Names what the run left out, so a bounded list does not read as the complete set. */
const truncationNote = (truncated: boolean | undefined): string =>
  truncated ? ' (truncated by the producer: not the complete set)' : '';

const formatBehaviorExecution = (
  execution: NonNullable<
    NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>['tier2']
  >['behaviors'][number]['execution']
): string => {
  // Absence is not a verdict: the producer reported no result for this behavior, which must
  // not read as "did not run".
  if (!execution) {
    return ' — execution not reported';
  }
  if (!execution.executed) {
    return ' — not executed';
  }
  if (execution.hit) {
    return ` — executed, hit (${execution.row_count} row(s) in required indices)`;
  }
  // `hit: false` with a reason means nothing was learned, not that nothing is there. Said
  // plainly, because only the reasonless case is evidence of a clean environment.
  return execution.inconclusive_reason
    ? ` — executed, no verdict (${execution.inconclusive_reason}); this is not evidence the environment is clean`
    : ` — executed, no rows in required indices (clean)`;
};

const formatSignificantSecurityEventForAgent = (
  data: SignificantSecurityEventAttachmentData
): string => {
  const lines: string[] = [
    `Significant security event: ${data.title}`,
    `Severity: ${data.severity} (confidence ${data.confidence})`,
    `Status: ${data.status}`,
    `Source watch: ${data.source_watch} / Capability: ${data.capability} / Run: ${data.run_id}`,
    `Threat report: ${data.report_id}`,
    '',
    `Hypothesis tested: ${data.hypothesis_tested}`,
    '',
    'Timeline:',
  ];

  if (data.timeline.length === 0) {
    lines.push('  no timeline entries recorded');
  } else {
    pushBoundedSection(lines, data.timeline, (entry) => `  ${entry.at} — ${entry.what}`);
  }

  if (data.hunt_result) {
    const { tier1, tier2, hit_sources: hitSources } = data.hunt_result;
    lines.push(
      '',
      `Hunt result: ${data.hunt_result.has_confirmed_hit ? 'confirmed hit' : 'no confirmed hit'} (${
        data.hunt_result.time_range.from
      } to ${data.hunt_result.time_range.to})`,
      // Which tier confirmed *this* finding. The tier statuses below are report-scoped, so a
      // Tier 1 status of `environment_hits_found` can accompany a finding Tier 1 never
      // corroborated; without this line the model attributes the hit to the wrong tier.
      `Confirmed by: ${
        hitSources.length > 0 ? hitSources.join(', ') : 'nothing (no confirmed hit)'
      }`,
      `Tier 1: ${tier1.status} — ${tier1.counts.total_hits} total hits${
        tier1.counts.returned_hits < tier1.counts.total_hits
          ? ` (${tier1.counts.returned_hits} returned)`
          : ''
      }, ${tier1.counts.affected_hosts} affected hosts, ${
        tier1.counts.affected_users
      } affected users`
    );
    if (tier1.per_index.length > 0) {
      lines.push(`  Per index${truncationNote(tier1.per_index_truncated)}:`);
      pushBoundedSection(
        lines,
        tier1.per_index,
        (entry) =>
          `    ${entry.index}: ${entry.hit_count} hit(s)${entry.required ? ' (required)' : ''}`
      );
    }
    if (tier1.resolved_iocs.length > 0) {
      lines.push(`  Resolved IOCs${truncationNote(tier1.resolved_iocs_truncated)}:`);
      pushBoundedSection(lines, tier1.resolved_iocs, (ioc) => `    ${ioc.type}: ${ioc.value}`);
    }
    if (tier2) {
      lines.push(`Tier 2: ${tier2.status}${truncationNote(tier2.behaviors_truncated)}`);
      pushBoundedSection(
        lines,
        tier2.behaviors,
        (behavior) =>
          `  ${behavior.technique_id} (${behavior.tactic_ids.join(', ')}, confidence ${
            behavior.confidence
          }): ${behavior.rule_name}${formatBehaviorExecution(behavior.execution)}`
      );
    }
  }

  lines.push('', 'Security knowledge indicators (taxonomy labels, not Discover IOCs):');
  if (data.security_knowledge_indicators.length === 0) {
    lines.push('  no indicators recorded');
  } else {
    pushBoundedSection(lines, data.security_knowledge_indicators, (indicator) => {
      const confidence =
        indicator.confidence != null ? ` (confidence ${indicator.confidence})` : '';
      const detail =
        indicator.type === 'technique' && indicator.technique_id
          ? ` [${indicator.technique_id}]`
          : indicator.type === 'ioc' && indicator.ioc
            ? ` [${indicator.ioc.type}: ${indicator.ioc.value}]`
            : '';
      return `  ${indicator.type}: ${indicator.value}${detail}${confidence}`;
    });
  }

  lines.push('', 'Entities:');
  if (data.entities.length === 0) {
    lines.push('  no entities recorded');
  } else {
    pushBoundedSection(lines, data.entities, (entity) => `  ${entity.field}: ${entity.value}`);
  }

  if (data.alerts && data.alerts.length > 0) {
    lines.push('', 'Alerts:');
    pushBoundedSection(lines, data.alerts, (alert) => {
      const timestamp = alert.timestamp ? ` @ ${alert.timestamp}` : '';
      return `  ${alert.alert_id} (${alert.index})${timestamp}`;
    });
  }

  if (data.events && data.events.length > 0) {
    lines.push('', 'Events:');
    pushBoundedSection(lines, data.events, (event) => {
      const matched = event.matched
        ? ` [matched: ${
            event.matched.ioc
              ? `ioc ${event.matched.ioc.value}`
              : event.matched.technique_id
                ? `technique ${event.matched.technique_id}`
                : 'unspecified'
          } on ${event.matched.field}]`
        : '';
      return `  ${event.event_id} (${event.source_index})${matched}`;
    });
  }

  lines.push('', 'Evidence for:');
  if (data.evidence_for.length === 0) {
    lines.push('  none recorded');
  } else {
    pushBoundedSection(lines, data.evidence_for, (item) => `  - ${item}`);
  }

  lines.push('', 'Evidence against:');
  if (data.evidence_against.length === 0) {
    lines.push('  none recorded');
  } else {
    pushBoundedSection(lines, data.evidence_against, (item) => `  - ${item}`);
  }

  if (data.maps_to_proposal) {
    const proposal = data.maps_to_proposal;
    lines.push('', 'Maps to proposal:');
    if (proposal.category) {
      lines.push(`  Category: ${proposal.category}`);
    }
    if (proposal.impact) {
      lines.push(`  Impact: ${proposal.impact}`);
    }
    if (proposal.confidence != null) {
      lines.push(`  Confidence: ${proposal.confidence}`);
    }
    if (proposal.actionWorkflowId) {
      lines.push(`  Action workflow: ${proposal.actionWorkflowId}`);
    }
    if (proposal.actionInput) {
      const inputEntries = Object.entries(proposal.actionInput);
      if (inputEntries.length > 0) {
        lines.push('  Action input:');
        pushBoundedSection(
          lines,
          inputEntries,
          ([key, value]) =>
            `    ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
        );
      }
    }
    if (proposal.manual_remediation && proposal.manual_remediation.length > 0) {
      lines.push('  Manual remediation:');
      pushBoundedSection(lines, proposal.manual_remediation, (step) => `    - ${step}`);
    }
  }

  lines.push('', `Evaluation record: ${data.evaluation_record_ref}`);

  if (data.truncated) {
    lines.push(
      `Note: this payload was truncated${
        data.truncated_original_count != null
          ? ` from ${data.truncated_original_count} original entries`
          : ''
      }; the counts above reflect only the retained entries.`
    );
  }

  return lines.join('\n');
};

const describePayload = `This attachment carries a Hunt-owned Significant Security Event.
The payload contains:
- title, severity, confidence, status: the headline classification of the event
- source_watch, capability, run_id, report_id: provenance of the hunt run that produced this event; report_id names the triggering threat report
- security_knowledge_indicators: typed taxonomy labels (technology/threat/risk/technique/ioc); technique entries carry technique_id, ioc entries carry a typed ioc value.
  These are NOT Discover IOCs by default (technology/threat/risk labels). Do not invent logs-* field mappings from \`type\`.
- entities: ECS \`{ field, value }\` refs (allowlisted entity fields only)
- alerts: \`{ alert_id, index, timestamp? }\` — always include the concrete alerts index
- events: \`{ event_id, source_index, timestamp?, matched? }\` — matched names the IOC or technique that produced the hit; source_index must be the hit's concrete _index (the .ds-... backing name for a data stream), never the data stream or alias searched
- timeline: an ordered sequence of (at, what) entries describing what happened
- hunt_result: structured Tier 1 / Tier 2 findings (status, counts, per-index hit detail, resolved IOCs, Tier 2 behaviors). Prefer these numbers over evidence_for/evidence_against when both are present.
  "Confirmed by" names the tier(s) that corroborated this finding; the tier statuses are report-scoped, so attribute the hit to that line and not to a tier status. A Tier 2 behavior with "no verdict" learned nothing and is not evidence of a clean environment.
- hypothesis_tested, evidence_for, evidence_against: the hunt's working hypothesis and its analyst narrative on top of hunt_result
- maps_to_proposal, evaluation_record_ref: optional links into the proposal/evaluation subsystem

Quote the \`what\` field of timeline entries verbatim rather than re-classifying or summarizing
them into different categories.`;

export const createSignificantSecurityEventAttachmentType = (): AttachmentTypeDefinition =>
  createReadonlyAttachmentType({
    id: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
    schema: significantSecurityEventAttachmentDataSchema,
    formatForAgent: formatSignificantSecurityEventForAgent,
    describePayload,
    renderNoun: 'event card',
    // Backstop only. The real bound is `SECTION_CHAR_BUDGET` per list section, which keeps a
    // payload at the schema's caps inside this limit; reaching it here would mean a section
    // grew unbounded, and the cut drops whole sections without saying so.
    maxContentLength: 150_000,
  });
