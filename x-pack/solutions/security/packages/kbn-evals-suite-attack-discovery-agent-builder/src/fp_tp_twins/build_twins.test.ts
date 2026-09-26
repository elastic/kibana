/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENCODED_POWERSHELL_ATTACK } from './attack';
import { buildEncodedPowershellTwin } from './build_twins';
import {
  ENCODED_POWERSHELL_ATTACK_ID,
  ENCODED_POWERSHELL_HOST_ENTITY_ID,
  ENCODED_POWERSHELL_NETWORK_2_ID,
  ENCODED_POWERSHELL_PROCESS_1_ID,
} from './constants';

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

  it('returns the same alert ids for both twins', () => {
    expect(fp.alerts.map((alert) => alert.id)).toEqual(tp.alerts.map((alert) => alert.id));
  });

  it('returns alert documents that differ only by twin labels', () => {
    const withoutLabels = (source: Record<string, unknown>): Record<string, unknown> => {
      const rest = { ...source };
      delete rest.labels;
      return rest;
    };
    expect(fp.alerts.map((alert) => withoutLabels(alert.source))).toEqual(
      tp.alerts.map((alert) => withoutLabels(alert.source))
    );
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
    const event = tp.events.find((item) => item.id === ENCODED_POWERSHELL_PROCESS_1_ID);
    expect(processParentName(event?.source ?? {})).toBe('WINWORD.EXE');
  });

  it('returns ccmexec as the parent of the first fp process event', () => {
    const event = fp.events.find((item) => item.id === ENCODED_POWERSHELL_PROCESS_1_ID);
    expect(processParentName(event?.source ?? {})).toBe('ccmexec.exe');
  });

  it('returns the malicious C2 domain on the tp network event', () => {
    const event = tp.events.find((item) => item.id === ENCODED_POWERSHELL_NETWORK_2_ID);
    expect(destinationDomain(event?.source ?? {})).toBe('malicious-c2.example.com');
  });

  it('returns the Microsoft management domain on the fp network event', () => {
    const event = fp.events.find((item) => item.id === ENCODED_POWERSHELL_NETWORK_2_ID);
    expect(destinationDomain(event?.source ?? {})).toBe('manage.microsoft.com');
  });

  it('returns an employee workstation host entity on the tp twin', () => {
    const host = tp.entities.find((entity) => entity.id === ENCODED_POWERSHELL_HOST_ENTITY_ID);
    const entity = host?.source.entity as { sub_type?: string } | undefined;
    expect(entity?.sub_type).toBe('employee_workstation');
  });

  it('returns an mdm_management host entity on the fp twin', () => {
    const host = fp.entities.find((entity) => entity.id === ENCODED_POWERSHELL_HOST_ENTITY_ID);
    const entity = host?.source.entity as { sub_type?: string } | undefined;
    expect(entity?.sub_type).toBe('mdm_management');
  });

  it('returns gold that requires entity store and raw events', () => {
    expect(fp.gold.mustRetrieve).toEqual(['entity_store', 'raw_events']);
  });

  it('returns fp evidence event ids that exist in the fp event set', () => {
    const eventIds = new Set(fp.events.map((event) => event.id));
    expect(fp.gold.evidenceIds.event.every((id) => eventIds.has(id))).toBe(true);
  });

  it('returns the authored attack id', () => {
    expect(tp.attack['kibana.alert.uuid']).toBe(ENCODED_POWERSHELL_ATTACK_ID);
  });

  it('returns the authored attack document from the twin builder', () => {
    expect(tp.attack).toEqual(ENCODED_POWERSHELL_ATTACK);
  });
});
