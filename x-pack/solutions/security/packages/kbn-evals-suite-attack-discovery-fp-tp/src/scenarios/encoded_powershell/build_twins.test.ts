/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEncodedPowershellAttack } from './attack';
import { buildEncodedPowershellTwin } from './build_twins';
import { ENCODED_POWERSHELL_ATTACK_ID, getEncodedPowershellIds } from './ids';

const destinationDomain = (eventSource: Record<string, unknown>): string | undefined => {
  const destination = eventSource.destination;
  if (typeof destination !== 'object' || destination === null || !('domain' in destination)) {
    return undefined;
  }
  return typeof destination.domain === 'string' ? destination.domain : undefined;
};

const processParentName = (eventSource: Record<string, unknown>): string | undefined => {
  const process = eventSource.process;
  if (typeof process !== 'object' || process === null || !('parent' in process)) {
    return undefined;
  }
  const parent = process.parent;
  if (typeof parent !== 'object' || parent === null || !('name' in parent)) {
    return undefined;
  }
  return typeof parent.name === 'string' ? parent.name : undefined;
};

describe('encoded-powershell FP/TP twins', () => {
  const tp = buildEncodedPowershellTwin('tp');
  const fp = buildEncodedPowershellTwin('fp');
  const ids = getEncodedPowershellIds();

  it('returns the same alert ids for both twins', () => {
    expect(fp.alerts.map((alert) => alert.id)).toEqual(tp.alerts.map((alert) => alert.id));
  });

  it('returns identical alert documents for both twins', () => {
    expect(fp.alerts).toEqual(tp.alerts);
  });

  it.each([
    ['tp', tp],
    ['fp', fp],
  ])('returns %s seeded documents that do not name the variant', (variant, twin) => {
    const seeded = JSON.stringify([twin.alerts, twin.events, twin.entities, twin.attack]);
    expect(seeded).not.toContain(`encoded-powershell.${variant}`);
  });

  it('returns a fp process message that matches its parent', () => {
    const event = fp.events.find((item) => item.id === ids.process1Id);
    expect(event?.source.message).toBe('ccmexec.exe started powershell.exe');
  });

  it('returns a fp network message that matches its destination', () => {
    const event = fp.events.find((item) => item.id === ids.network2Id);
    expect(event?.source.message).toBe(
      'powershell.exe connected to manage.microsoft.com (20.190.128.10:443)'
    );
  });

  it('returns a tp process message that matches its parent', () => {
    const event = tp.events.find((item) => item.id === ids.process1Id);
    expect(event?.source.message).toBe('WINWORD.EXE started powershell.exe');
  });

  it.each([
    'malicious-c2.example.com',
    'payload.exe',
    'ADMIN$',
    'update.ps1',
    'CurrentVersion\\\\Run',
  ])('returns no fp raw event that mentions %s', (needle) => {
    expect(JSON.stringify(fp.events)).not.toContain(needle);
  });

  it('returns the SCCM distribution point on the fp step 4 command line', () => {
    const event = fp.events.find((item) => item.id === ids.network4Id);
    const process = event?.source.process as { command_line?: string } | undefined;
    expect(process?.command_line).toContain('\\\\sccm-dp-02.contoso.local\\SMS_DP$');
  });

  it('returns a fp file message that matches its path', () => {
    const event = fp.events.find((item) => item.id === ids.file3Id);
    expect(event?.source.message).toBe(
      'powershell.exe created C:\\Windows\\CCM\\SystemTemp\\ComplianceScript.ps1'
    );
  });

  it('returns the Run-key command line on the tp step 3 process event', () => {
    const event = tp.events.find((item) => item.id === ids.process3Id);
    const process = event?.source.process as { command_line?: string } | undefined;
    expect(process?.command_line).toContain('CurrentVersion\\Run');
  });

  it('returns the same authored attack document for both twins', () => {
    expect(fp.attack).toEqual(tp.attack);
  });

  it('returns true_positive gold for the tp twin', () => {
    expect(tp.gold.classification).toBe('true_positive');
  });

  it('returns false_positive gold for the fp twin', () => {
    expect(fp.gold.classification).toBe('false_positive');
  });

  it('returns WINWORD as the parent of the first tp process event', () => {
    const event = tp.events.find((item) => item.id === ids.process1Id);
    expect(processParentName(event?.source ?? {})).toBe('WINWORD.EXE');
  });

  it('returns powershell as the parent of the tp network event', () => {
    const event = tp.events.find((item) => item.id === ids.network2Id);
    expect(processParentName(event?.source ?? {})).toBe('powershell.exe');
  });

  it('returns ccmexec as the parent of the first fp process event', () => {
    const event = fp.events.find((item) => item.id === ids.process1Id);
    expect(processParentName(event?.source ?? {})).toBe('ccmexec.exe');
  });

  it('returns the malicious C2 domain on the tp network event', () => {
    const event = tp.events.find((item) => item.id === ids.network2Id);
    expect(destinationDomain(event?.source ?? {})).toBe('malicious-c2.example.com');
  });

  it('returns the Microsoft management domain on the fp network event', () => {
    const event = fp.events.find((item) => item.id === ids.network2Id);
    expect(destinationDomain(event?.source ?? {})).toBe('manage.microsoft.com');
  });

  it('returns the SCCM distribution point on the fp SMB event', () => {
    const event = fp.events.find((item) => item.id === ids.network4Id);
    expect(destinationDomain(event?.source ?? {})).toBe('sccm-dp-02.contoso.local');
  });

  it('returns an employee workstation host entity on the tp twin', () => {
    const host = tp.entities.find((entity) => entity.id === ids.hostEntityId);
    const entity = host?.source.entity as { sub_type?: string } | undefined;
    expect(entity?.sub_type).toBe('employee_workstation');
  });

  it('returns an mdm_management host entity on the fp twin', () => {
    const host = fp.entities.find((entity) => entity.id === ids.hostEntityId);
    const entity = host?.source.entity as { sub_type?: string } | undefined;
    expect(entity?.sub_type).toBe('mdm_management');
  });

  it('returns a host entity whose host.id matches the seeded alerts', () => {
    const host = tp.entities.find((entity) => entity.id === ids.hostEntityId);
    const alertHost = tp.alerts[0].source.host as { id?: string };
    expect((host?.source.host as { id?: string }).id).toBe(alertHost.id);
  });

  it('returns gold that requires entity store and raw events', () => {
    expect(fp.gold.mustRetrieve).toEqual(['entity_store', 'raw_events']);
  });

  it('returns fp evidence event ids that exist in the fp event set', () => {
    const eventIds = new Set(fp.events.map((event) => event.id));
    expect(fp.gold.evidenceIds.event.every((id) => eventIds.has(id))).toBe(true);
  });

  it('returns an attack that cites every seeded alert', () => {
    expect(tp.attack['kibana.alert.attack_discovery.alert_ids']).toEqual(
      tp.alerts.map((alert) => alert.id)
    );
  });

  it('returns the authored attack id', () => {
    expect(tp.attack['kibana.alert.uuid']).toBe(ENCODED_POWERSHELL_ATTACK_ID);
  });

  it('returns the authored attack document from the twin builder', () => {
    expect(tp.attack).toEqual(buildEncodedPowershellAttack());
  });

  it('returns raw events that all fall within two hours of the attack timestamp', () => {
    const attackMs = Date.parse(tp.attack['@timestamp'] as string);
    const offsets = tp.events.map((event) =>
      Math.abs(Date.parse(event.source['@timestamp'] as string) - attackMs)
    );
    expect(Math.max(...offsets)).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it('returns different alert ids for a different run marker', () => {
    const other = buildEncodedPowershellTwin('tp', 'another-run');
    expect(other.alerts[0].id).not.toBe(tp.alerts[0].id);
  });
});
