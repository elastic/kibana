/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ALERTZERO_ATTACHMENT_TYPES } from '../../../common/constants';
import {
  significantSecurityEventAttachmentDataSchema,
  type SignificantSecurityEventAttachmentData,
} from '../../../common/significant_security_event_schema';

export const SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID =
  ALERTZERO_ATTACHMENT_TYPES.significantSecurityEvent;

export {
  significantSecurityEventAttachmentDataSchema,
  type SignificantSecurityEventAttachmentData,
} from '../../../common/significant_security_event_schema';

const formatSignificantSecurityEventForAgent = (
  data: SignificantSecurityEventAttachmentData
): string => {
  const lines: string[] = [
    `Significant security event: ${data.title}`,
    `Severity: ${data.severity} (confidence ${data.confidence})`,
    `Status: ${data.status}`,
    `Source watch: ${data.source_watch} / Capability: ${data.capability} / Run: ${data.run_id}`,
    '',
    `Hypothesis tested: ${data.hypothesis_tested}`,
    '',
    'Timeline:',
  ];

  if (data.timeline.length === 0) {
    lines.push('  no timeline entries recorded');
  } else {
    for (const entry of data.timeline) {
      lines.push(`  ${entry.at} — ${entry.what}`);
    }
  }

  if (data.hunt_result) {
    const { tier1, tier2 } = data.hunt_result;
    lines.push(
      '',
      `Hunt result: ${data.hunt_result.has_confirmed_hit ? 'confirmed hit' : 'no confirmed hit'} (${
        data.hunt_result.time_range.from
      } to ${data.hunt_result.time_range.to})`,
      `Tier 1: ${tier1.status} — ${tier1.counts.total_hits} total hits, ${tier1.counts.affected_hosts} affected hosts, ${tier1.counts.affected_users} affected users`
    );
    for (const entry of tier1.per_index) {
      lines.push(
        `  ${entry.index}: ${entry.hit_count} hit(s)${entry.required ? ' (required)' : ''}`
      );
    }
    if (tier1.resolved_iocs.length > 0) {
      lines.push('  Resolved IOCs:');
      for (const ioc of tier1.resolved_iocs) {
        lines.push(`    ${ioc.type}: ${ioc.value}`);
      }
    }
    if (tier2) {
      lines.push(`Tier 2: ${tier2.status}`);
      for (const behavior of tier2.behaviors) {
        lines.push(
          `  ${behavior.technique_id} (${behavior.tactic_ids.join(', ')}, confidence ${
            behavior.confidence
          }): ${behavior.rule_name}`
        );
      }
    }
  }

  lines.push('', 'Security knowledge indicators (taxonomy labels, not Discover IOCs):');
  if (data.security_knowledge_indicators.length === 0) {
    lines.push('  no indicators recorded');
  } else {
    for (const indicator of data.security_knowledge_indicators) {
      const confidence =
        indicator.confidence != null ? ` (confidence ${indicator.confidence})` : '';
      const detail =
        indicator.type === 'technique' && indicator.technique_id
          ? ` [${indicator.technique_id}]`
          : indicator.type === 'ioc' && indicator.ioc
          ? ` [${indicator.ioc.type}: ${indicator.ioc.value}]`
          : '';
      lines.push(`  ${indicator.type}: ${indicator.value}${detail}${confidence}`);
    }
  }

  lines.push('', 'Entities:');
  if (data.entities.length === 0) {
    lines.push('  no entities recorded');
  } else {
    for (const entity of data.entities) {
      lines.push(`  ${entity.field}: ${entity.value}`);
    }
  }

  if (data.alerts && data.alerts.length > 0) {
    lines.push('', 'Alerts:');
    for (const alert of data.alerts) {
      const timestamp = alert.timestamp ? ` @ ${alert.timestamp}` : '';
      lines.push(`  ${alert.alert_id} (${alert.index})${timestamp}`);
    }
  }

  if (data.events && data.events.length > 0) {
    lines.push('', 'Events:');
    for (const event of data.events) {
      lines.push(`  ${event.event_id} (${event.source_index})`);
    }
  }

  lines.push('', 'Evidence for:');
  if (data.evidence_for.length === 0) {
    lines.push('  none recorded');
  } else {
    for (const item of data.evidence_for) {
      lines.push(`  - ${item}`);
    }
  }

  lines.push('', 'Evidence against:');
  if (data.evidence_against.length === 0) {
    lines.push('  none recorded');
  } else {
    for (const item of data.evidence_against) {
      lines.push(`  - ${item}`);
    }
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
    if (proposal.manual_remediation && proposal.manual_remediation.length > 0) {
      lines.push('  Manual remediation:');
      for (const step of proposal.manual_remediation) {
        lines.push(`    - ${step}`);
      }
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

const getAgentDescription = (): string => `
This attachment carries a Hunt-owned Significant Security Event.
The payload contains:
- title, severity, confidence, status: the headline classification of the event
- source_watch, capability, run_id, report_id: provenance of the hunt run that produced this event; report_id names the triggering threat report
- security_knowledge_indicators: typed taxonomy labels (technology/threat/risk/technique/ioc); technique entries carry technique_id, ioc entries carry a typed ioc value.
  These are NOT Discover IOCs by default (technology/threat/risk labels). Do not invent logs-* field mappings from \`type\`.
- entities: ECS \`{ field, value }\` refs (allowlisted entity fields only)
- alerts: \`{ alert_id, index, timestamp? }\` — always include the concrete alerts index
- events: \`{ event_id, source_index, timestamp?, matched? }\` — matched names the IOC or technique that produced the hit
- timeline: an ordered sequence of (at, what) entries describing what happened
- hunt_result: structured Tier 1 / Tier 2 findings (status, counts, per-index hit detail, resolved IOCs, Tier 2 behaviors). Prefer these numbers over evidence_for/evidence_against when both are present.
- hypothesis_tested, evidence_for, evidence_against: the hunt's working hypothesis and its analyst narrative on top of hunt_result
- maps_to_proposal, evaluation_record_ref: optional links into the proposal/evaluation subsystem

Quote the \`what\` field of timeline entries verbatim rather than re-classifying or summarizing
them into different categories.

## INLINE RENDERING (REQUIRED)
When a ${SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID} attachment is present in the conversation, you MUST render it inline using the exact custom XML element shown below. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename, translate, or abbreviate them.

Assemble the tag by substituting \`ATTACHMENT_ID\` with the value of the attachment's \`attachment_id\` field from the conversation's attachment manifest, and \`VERSION\` with the value of the \`current_version\` field:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

Rules:
- Copy \`attachment_id\` and \`current_version\` VERBATIM from the manifest. Never invent, guess, or rewrite them.
- Put the \`<render_attachment>\` tag on its OWN LINE, with a blank line before and after it. Do not wrap it in backticks, quotes, code fences, or surrounding prose.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the event card first.
- Render each ${SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID} attachment at most once per turn.
`;

export const createSignificantSecurityEventAttachmentType = (): AttachmentTypeDefinition => ({
  id: SIGNIFICANT_SECURITY_EVENT_ATTACHMENT_ID,
  // System-produced event: the agent must not create or update these via the
  // attachment_add/update tools. Also gates the attachment_read path, which only
  // invokes format() for readonly types.
  isReadonly: true,
  validate: (input) => {
    const parseResult = significantSecurityEventAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment: Attachment<string, unknown>, _context: AttachmentFormatContext) => {
    const parseResult = significantSecurityEventAttachmentDataSchema.safeParse(attachment.data);
    if (!parseResult.success) {
      throw new Error(
        `Invalid significant security event attachment data for attachment ${attachment.id}`
      );
    }
    const data = parseResult.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatSignificantSecurityEventForAgent(data),
      }),
    };
  },
  getAgentDescription,
});
