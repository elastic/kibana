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
      `Tier 1: ${tier1.status} — ${tier1.counts.total_hits} total hits${
        tier1.counts.returned_hits < tier1.counts.total_hits
          ? ` (${tier1.counts.returned_hits} returned)`
          : ''
      }, ${tier1.counts.affected_hosts} affected hosts, ${
        tier1.counts.affected_users
      } affected users`
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
      const matched = event.matched
        ? ` [matched: ${
            event.matched.ioc
              ? `ioc ${event.matched.ioc.value}`
              : event.matched.technique_id
              ? `technique ${event.matched.technique_id}`
              : 'unspecified'
          } on ${event.matched.field}]`
        : '';
      lines.push(`  ${event.event_id} (${event.source_index})${matched}`);
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
    if (proposal.actionInput) {
      const inputEntries = Object.entries(proposal.actionInput);
      if (inputEntries.length > 0) {
        lines.push('  Action input:');
        for (const [key, value] of inputEntries) {
          lines.push(`    ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
        }
      }
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
    // Worst case across the schema's field/array caps: well over 100K characters.
    maxContentLength: 150_000,
  });
