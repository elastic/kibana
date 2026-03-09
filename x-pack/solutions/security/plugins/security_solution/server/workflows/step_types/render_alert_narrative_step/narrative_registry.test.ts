/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildNarrative } from './narrative_registry';

describe('buildNarrative routing', () => {
  it('routes DNS events to the DNS narrative', () => {
    const text = buildNarrative({
      event: { category: ['network'] },
      dns: { question: { name: ['malware.com'], type: ['A'] } },
      host: { name: ['host-1'] },
      kibana: { alert: { severity: ['high'], rule: { name: ['DNS Rule'] } } },
    });

    expect(text).toContain('DNS query for malware.com');
  });

  it('routes cloud events to the cloud narrative', () => {
    const text = buildNarrative({
      cloud: { provider: ['aws'], region: ['us-east-1'] },
      event: { action: ['ConsoleLogin'] },
      aws: { cloudtrail: { user_identity: { arn: ['arn:aws:iam::root'] } } },
      kibana: { alert: { rule: { name: ['AWS Login'] } } },
    });

    expect(text).toContain('aws event ConsoleLogin');
  });

  it('routes threat match events to the threat match narrative', () => {
    const text = buildNarrative({
      threat: { indicator: { matched: { atomic: ['1.2.3.4'], type: ['ip'] } } },
      kibana: { alert: { rule: { type: ['threat_match'], name: ['IOC Match'] } } },
    });

    expect(text).toContain('Threat indicator match');
  });

  it('routes ML events to the machine learning narrative', () => {
    const text = buildNarrative({
      event: { action: ['rare_process'] },
      host: { name: ['host-1'] },
      kibana: { alert: { rule: { type: ['machine_learning'], name: ['ML Rule'] } } },
    });

    expect(text).toContain('Machine learning anomaly detected');
  });

  it('routes authentication events to the auth narrative', () => {
    const text = buildNarrative({
      event: { category: ['authentication'], action: ['user_logon'], outcome: ['success'] },
      user: { name: ['admin'] },
      host: { name: ['dc-01'] },
      kibana: { alert: { rule: { name: ['Auth Rule'] } } },
    });

    expect(text).toContain('Authentication logon success');
  });

  it('routes registry events to the registry narrative', () => {
    const text = buildNarrative({
      event: { action: ['modification'] },
      registry: { key: ['HKLM\\Software\\Test'] },
      host: { name: ['host-1'] },
      kibana: { alert: { rule: { name: ['Registry Rule'] } } },
    });

    expect(text).toContain('Registry modification');
  });

  it('routes network events to the network narrative', () => {
    const text = buildNarrative({
      event: { category: ['network'] },
      source: { ip: ['10.0.0.1'] },
      destination: { ip: ['10.0.0.2'], port: [443] },
      kibana: { alert: { rule: { name: ['Network Rule'] } } },
    });

    expect(text).toContain('Network connection');
  });

  it('routes file-only events to the file narrative', () => {
    const text = buildNarrative({
      event: { category: ['file'], action: ['creation'] },
      file: { name: ['malware.exe'], path: ['/tmp/malware.exe'] },
      host: { name: ['host-1'] },
      kibana: { alert: { rule: { name: ['File Rule'] } } },
    });

    expect(text).toContain('File creation');
  });

  it('falls back to process narrative for process events', () => {
    const text = buildNarrative({
      event: { category: ['process'], action: ['start'] },
      process: { name: ['bash'], pid: [1234] },
      user: { name: ['root'] },
      host: { name: ['server-1'] },
      kibana: { alert: { severity: ['low'], rule: { name: ['Process Rule'] } } },
    });

    expect(text).toContain('process event');
    expect(text).toContain('started process bash');
  });

  it('threat_match takes priority over network category', () => {
    const text = buildNarrative({
      event: { category: ['network'] },
      source: { ip: ['1.2.3.4'] },
      threat: { indicator: { matched: { atomic: ['1.2.3.4'], type: ['ip'] } } },
      kibana: { alert: { rule: { type: ['threat_match'], name: ['IOC Match'] } } },
    });

    expect(text).toContain('Threat indicator match');
    expect(text).not.toContain('Network connection');
  });

  it('DNS takes priority over generic network', () => {
    const text = buildNarrative({
      event: { category: ['network'] },
      dns: { question: { name: ['evil.com'] } },
      source: { ip: ['10.0.0.1'] },
      kibana: { alert: { rule: { name: ['DNS Alert'] } } },
    });

    expect(text).toContain('DNS query');
    expect(text).not.toContain('Network connection');
  });
});
