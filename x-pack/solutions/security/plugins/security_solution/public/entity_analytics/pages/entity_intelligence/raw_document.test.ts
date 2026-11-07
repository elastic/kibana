/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPlainSummary,
  detectRawDocumentKind,
  extractRawDocument,
  HUMAN_FIELD_LABELS,
  readPath,
} from './raw_document';

const alertSource = {
  '@timestamp': '2026-07-07T09:03:18.643Z',
  event: { kind: 'signal', action: 'alert', category: ['process'], dataset: 'docker.events' },
  'kibana.alert.uuid': 'cbba9d8e',
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 75,
  'kibana.alert.reason': 'Image pulled from untrusted registry on docker-host-prod-01',
  'kibana.alert.rule.name': 'Docker - Image Pulled from Untrusted Registry',
  'kibana.alert.rule.threat': [
    {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'Initial Access' },
      technique: [{ id: 'T1195.002', name: 'Compromise Software Supply Chain' }],
    },
  ],
  host: {
    name: 'docker-host-prod-01',
    ip: ['10.0.6.10'],
    os: { name: 'Ubuntu 22.04' },
    type: 'server',
  },
  user: { name: 'a.rodriguez' },
  process: { name: 'dockerd', executable: '/usr/bin/dockerd' },
};

const eventSource = {
  '@timestamp': '2026-07-11T09:16:34.433Z',
  event: {
    kind: 'event',
    action: 'connection',
    category: ['network'],
    dataset: 'hunt_seed.network',
  },
  destination: { ip: '185.220.101.5', port: 4444 },
  network: { direction: 'outbound' },
  source: { ip: '10.0.6.10' },
  host: { name: 'docker-host-prod-01', ip: ['10.0.6.10'] },
  user: { name: 'a.rodriguez' },
};

const processEventSource = {
  '@timestamp': '2026-07-07T14:06:18.635Z',
  event: { kind: 'event', action: 'ProcessRollup2', category: ['process'] },
  process: {
    name: 'schtasks.exe',
    pid: 5700,
    executable: 'C:\\Windows\\System32\\schtasks.exe',
    command_line: 'schtasks.exe /create',
    parent: { name: 'powershell.exe', pid: 5300 },
  },
  file: { path: 'C:\\ProgramData\\update.exe', hash: { sha256: 'abc123' } },
  host: { name: 'LAPTOP-FIN03' },
};

describe('readPath', () => {
  it('reads a flattened dotted key', () => {
    expect(readPath(alertSource, 'kibana.alert.rule.name')).toBe(
      'Docker - Image Pulled from Untrusted Registry'
    );
  });

  it('reads a nested object path', () => {
    expect(readPath(eventSource, 'destination.ip')).toBe('185.220.101.5');
    expect(readPath(eventSource, 'host.name')).toBe('docker-host-prod-01');
  });

  it('returns undefined for a missing path', () => {
    expect(readPath(eventSource, 'process.command_line')).toBeUndefined();
  });
});

describe('detectRawDocumentKind', () => {
  it('detects alerts by event.kind=signal', () => {
    expect(detectRawDocumentKind(alertSource)).toBe('alert');
  });

  it('detects alerts by a kibana.alert.* marker even without signal kind', () => {
    expect(detectRawDocumentKind({ 'kibana.alert.uuid': 'x' })).toBe('alert');
  });

  it('detects raw ECS events', () => {
    expect(detectRawDocumentKind(eventSource)).toBe('event');
  });
});

describe('extractRawDocument', () => {
  it('returns undefined for non-object input', () => {
    expect(extractRawDocument(undefined)).toBeUndefined();
    expect(extractRawDocument('nope')).toBeUndefined();
    expect(extractRawDocument([])).toBeUndefined();
  });

  it('extracts alert fields: severity, risk score, rule, reason, threat', () => {
    const model = extractRawDocument(alertSource);
    expect(model?.kind).toBe('alert');
    expect(model?.severity).toBe('high');
    expect(model?.riskScore).toBe(75);
    expect(model?.ruleName).toBe('Docker - Image Pulled from Untrusted Registry');
    expect(model?.reason).toContain('untrusted registry');
    expect(model?.threats).toHaveLength(1);
    expect(model?.threats[0].tacticName).toBe('Initial Access');
    expect(model?.threats[0].techniques[0]).toEqual({
      id: 'T1195.002',
      name: 'Compromise Software Supply Chain',
    });
  });

  it('renders host arrays and os as readable fields', () => {
    const model = extractRawDocument(alertSource);
    const host = Object.fromEntries((model?.host ?? []).map((f) => [f.key, f.value]));
    expect(host['host.name']).toBe('docker-host-prod-01');
    expect(host['host.ip']).toBe('10.0.6.10');
    expect(host['host.os.name']).toBe('Ubuntu 22.04');
  });

  it('combines destination ip + port into ip:port', () => {
    const model = extractRawDocument(eventSource);
    const dest = model?.destination.find((f) => f.key === 'destination.ip');
    expect(dest?.value).toBe('185.220.101.5:4444');
    const src = model?.source.find((f) => f.key === 'source.ip');
    expect(src?.value).toBe('10.0.6.10');
  });

  it('extracts process + file fields for an event doc', () => {
    const model = extractRawDocument(processEventSource);
    expect(model?.kind).toBe('event');
    const process = Object.fromEntries((model?.process ?? []).map((f) => [f.key, f.value]));
    expect(process['process.name']).toBe('schtasks.exe');
    expect(process['process.pid']).toBe('5700');
    expect(process['process.parent.name']).toBe('powershell.exe');
    const file = Object.fromEntries((model?.file ?? []).map((f) => [f.key, f.value]));
    expect(file['file.path']).toBe('C:\\ProgramData\\update.exe');
    expect(file['file.hash.sha256']).toBe('abc123');
  });

  it('omits absent sections/fields entirely', () => {
    const model = extractRawDocument(eventSource);
    // No process / file on the network event.
    expect(model?.process).toHaveLength(0);
    expect(model?.file).toHaveLength(0);
    // No alert-only fields.
    expect(model?.severity).toBeUndefined();
    expect(model?.ruleName).toBeUndefined();
    expect(model?.threats).toHaveLength(0);
  });

  it('is resilient to a malformed threat block', () => {
    const model = extractRawDocument({
      'kibana.alert.uuid': 'x',
      'kibana.alert.rule.threat': [{ tactic: 'not-an-object' }, 42, null],
    });
    expect(model?.kind).toBe('alert');
    expect(model?.threats).toHaveLength(1);
    expect(model?.threats[0].tacticName).toBeUndefined();
    expect(model?.threats[0].techniques).toHaveLength(0);
  });
});

describe('humanized field labels', () => {
  it('labels fields with human-friendly names, never raw ECS keys', () => {
    const model = extractRawDocument(processEventSource);
    const byKey = Object.fromEntries(
      [...(model?.process ?? []), ...(model?.file ?? [])].map((f) => [f.key, f.label])
    );
    expect(byKey['process.command_line']).toBe('Command line');
    expect(byKey['process.parent.name']).toBe('Parent process');
    expect(byKey['process.name']).toBe('Process');
    expect(byKey['file.path']).toBe('File path');
    // Never the raw dotted key.
    for (const field of [...(model?.process ?? []), ...(model?.file ?? [])]) {
      expect(field.label).not.toContain('.');
      expect(HUMAN_FIELD_LABELS[field.key]).toBe(field.label);
    }
  });

  it('labels the destination as a friendly name', () => {
    const model = extractRawDocument(eventSource);
    expect(model?.destination[0].label).toBe('Destination');
    expect(model?.source[0].label).toBe('Source');
  });
});

describe('primary vs detail field grouping', () => {
  it('marks headline fields primary and verbose fields detail', () => {
    const model = extractRawDocument(processEventSource);
    const group = (fields = model?.process ?? [], key: string) =>
      fields.find((f) => f.key === key)?.group;
    expect(group(model?.process, 'process.name')).toBe('primary');
    expect(group(model?.process, 'process.command_line')).toBe('primary');
    expect(group(model?.process, 'process.pid')).toBe('detail');
    expect(group(model?.process, 'process.executable')).toBe('detail');
    expect(group(model?.event, 'event.category')).toBe('primary');
    expect(group(model?.file, 'file.path')).toBe('primary');
    expect(group(model?.file, 'file.hash.sha256')).toBe('detail');
    // event.dataset (verbose) is grouped as detail — assert on the alert fixture
    // which carries a dataset.
    const alertModel = extractRawDocument(alertSource);
    expect(alertModel?.event.find((f) => f.key === 'event.dataset')?.group).toBe('detail');
  });
});

describe('buildPlainSummary', () => {
  it('describes an alert with rule, severity, and MITRE tactic + technique', () => {
    const model = extractRawDocument(alertSource);
    const summary = model ? buildPlainSummary(model) : '';
    expect(summary).toBe(
      'Alert: Docker - Image Pulled from Untrusted Registry — high severity, MITRE Initial Access (T1195.002).'
    );
  });

  it('describes a process event in plain language with a friendly verb', () => {
    const model = extractRawDocument(processEventSource);
    const summary = model ? buildPlainSummary(model) : '';
    expect(summary).toBe('schtasks.exe was launched on LAPTOP-FIN03.');
  });

  it('describes a network event including the destination', () => {
    const model = extractRawDocument(eventSource);
    const summary = model ? buildPlainSummary(model) : '';
    expect(summary).toContain('made a network connection');
    expect(summary).toContain('docker-host-prod-01');
    expect(summary).toContain('by a.rodriguez');
    expect(summary).toContain('connected to 185.220.101.5:4444');
  });

  it('falls back gracefully when the rule / severity are missing', () => {
    const model = extractRawDocument({ 'kibana.alert.uuid': 'x' });
    const summary = model ? buildPlainSummary(model) : '';
    expect(summary).toContain('Alert:');
    expect(summary).toContain('detection alert');
  });
});
