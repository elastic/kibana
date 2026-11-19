/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { registerAttachments } from './register_attachments';

describe('registerAttachments', () => {
  const setup = agentBuilderMocks.createSetup();
  const registered: AttachmentTypeDefinition[] = [];

  beforeAll(() => {
    registerAttachments(setup);
    setup.attachments.registerType.mock.calls.forEach(([definition]) => {
      registered.push(definition);
    });
  });

  it('registers the Hunt Watch attachment types', () => {
    expect(registered.map(({ id }) => id).sort()).toEqual([
      'security.hunt_coordinator_result',
      'security.significant_security_event',
      'security.threat',
    ]);
  });

  // A new description-bearing type must be added here on purpose, so it is checked too.
  it('gives only the threat and significant security event types an agent description', () => {
    expect(
      registered
        .filter(({ getAgentDescription }) => getAgentDescription)
        .map(({ id }) => id)
        .sort()
    ).toEqual(['security.significant_security_event', 'security.threat']);
  });

  // The platform prompt owns when to render. A description may say what the card shows and
  // nothing else about rendering, so it is pinned in full: any added instruction, however
  // worded, needs a deliberate update here.
  const getDescription = (id: string) =>
    registered.find((type) => type.id === id)?.getAgentDescription?.();

  it('pins the full security.threat description', () => {
    expect(getDescription('security.threat')).toMatchInlineSnapshot(`
      "This attachment names a threat intelligence report by reference (by-reference semantics).
      The payload contains:
      - report_id: the id of the threat report this attachment points to
      - title, severity, source (optional): a captured fallback snapshot taken at write time

      The live report document is fetched space-projected at render time; the captured fields above
      are only a fallback used when the live document cannot be resolved. Quote the captured fields
      verbatim when discussing this attachment rather than restating the full report from memory.

      Rendering this attachment inline displays the threat report as a card: title, severity and source, indicators of compromise grouped by type with those not hunted set apart, tactics, techniques, regions and categories, and the Diamond model."
    `);
  });

  it('pins the full security.significant_security_event description', () => {
    expect(getDescription('security.significant_security_event')).toMatchInlineSnapshot(`
      "This attachment carries a Hunt-owned Significant Security Event.
      The payload contains:
      - title, severity, confidence, status: the headline classification of the event
      - source_watch, capability, run_id, report_id: provenance of the hunt run that produced this event; report_id names the triggering threat report
      - security_knowledge_indicators: typed taxonomy labels (technology/threat/risk/technique/ioc); technique entries carry technique_id, ioc entries carry a typed ioc value.
        These are NOT Discover IOCs by default (technology/threat/risk labels). Do not invent logs-* field mappings from \`type\`.
      - entities: ECS \`{ field, value }\` refs (allowlisted entity fields only)
      - alerts: \`{ alert_id, index, timestamp? }\` — always include the concrete alerts index
      - events: \`{ event_id, source_index, timestamp?, matched? }\` — matched names the IOC or technique that produced the hit; source_index must be the hit's concrete _index (the .ds-... backing name for a data stream), never the data stream or alias searched
      - summary, basis, detections: the hit-centric headline, the graded basis for the hit (ioc_strong, ioc_weak, behavior_only, ioc_and_behavior) and one entry per IOC or behavior that matched, with the field it matched on and its event/host/user scope. Old payloads may lack them.
      - hunt_result: structured IOC Hunt / Behavior Hunt findings (status, counts, per-index hit detail, resolved IOCs, derived behaviors). Prefer these numbers over evidence_for/evidence_against when both are present.
        \\"Confirmed by\\" names the hunt(s) that corroborated this finding; the hunt statuses are report-scoped, so attribute the hit to that line and not to a hunt status. A behavior with \\"no verdict\\" learned nothing and is not evidence of a clean environment.
      - hypothesis_tested, evidence_for, evidence_against: the hunt's working hypothesis and its analyst narrative on top of hunt_result
      - evaluation_record_ref: link into the evaluation subsystem

      Rendering this attachment inline displays the finding as a card: the headline with its basis, what matched and where, the hosts and users involved, related events with links to Discover, and the hypothesis with its evidence for and against."
    `);
  });
});
