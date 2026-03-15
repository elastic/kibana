/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractAlertFeatures,
  composeFeatureText,
  hashFeatureText,
} from './extract_alert_features';
import type { AlertFeatures } from '../types';

describe('extractAlertFeatures', () => {
  it('extracts basic fields from a fully-populated alert', () => {
    const alert = {
      kibana: {
        alert: {
          rule: {
            name: 'Suspicious Process Execution',
            description: 'Detects execution of suspicious binaries',
          },
          severity: 'high',
          risk_score: 73,
        },
      },
      process: {
        name: 'powershell.exe',
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        command_line: 'powershell -enc SGVsbG8=',
        parent: {
          name: 'cmd.exe',
        },
      },
      host: { name: 'WORKSTATION-01' },
      user: { name: 'jdoe' },
      source: { ip: '10.0.0.5' },
      destination: { ip: '203.0.113.1' },
      file: {
        name: 'payload.ps1',
        path: 'C:\\Temp\\payload.ps1',
        hash: { sha256: 'abc123def456' },
      },
      event: { category: 'process', action: 'start' },
      network: { protocol: 'tcp' },
      dns: { question: { name: 'evil.example.com' } },
    };

    const features = extractAlertFeatures(alert);

    expect(features.ruleName).toBe('Suspicious Process Execution');
    expect(features.ruleDescription).toBe('Detects execution of suspicious binaries');
    expect(features.severity).toBe('high');
    expect(features.riskScore).toBe(73);
    expect(features.processName).toBe('powershell.exe');
    expect(features.processExecutable).toBe(
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
    );
    expect(features.processCommandLine).toBe('powershell -enc SGVsbG8=');
    expect(features.parentProcessName).toBe('cmd.exe');
    expect(features.hostName).toBe('WORKSTATION-01');
    expect(features.userName).toBe('jdoe');
    expect(features.sourceIp).toBe('10.0.0.5');
    expect(features.destinationIp).toBe('203.0.113.1');
    expect(features.fileName).toBe('payload.ps1');
    expect(features.filePath).toBe('C:\\Temp\\payload.ps1');
    expect(features.fileHash).toBe('abc123def456');
    expect(features.eventCategory).toBe('process');
    expect(features.eventAction).toBe('start');
    expect(features.networkProtocol).toBe('tcp');
    expect(features.dnsQuestionName).toBe('evil.example.com');
  });

  it('handles alerts with minimal fields', () => {
    const alert = {
      kibana: {
        alert: {
          rule: { name: 'Minimal Rule' },
          severity: 'low',
        },
      },
    };

    const features = extractAlertFeatures(alert);

    expect(features.ruleName).toBe('Minimal Rule');
    expect(features.severity).toBe('low');
    expect(features.processName).toBeUndefined();
    expect(features.hostName).toBeUndefined();
    expect(features.mitreTactics).toEqual([]);
    expect(features.mitreTechniques).toEqual([]);
  });

  it('defaults ruleName when missing', () => {
    const features = extractAlertFeatures({});
    expect(features.ruleName).toBe('Unknown Rule');
  });

  it('extracts MITRE ATT&CK tactics and techniques from threat field', () => {
    const alert = {
      kibana: {
        alert: {
          rule: {
            name: 'MITRE Test',
            threat: [
              {
                tactic: { name: 'Execution' },
                technique: [{ name: 'Command and Scripting Interpreter' }],
              },
            ],
          },
        },
      },
      threat: {
        tactic: { name: 'Defense Evasion' },
        technique: { name: 'Obfuscated Files or Information' },
      },
    };

    const features = extractAlertFeatures(alert);
    expect(features.mitreTactics).toContain('Defense Evasion');
    expect(features.mitreTechniques).toContain('Obfuscated Files or Information');
  });

  it('normalizes array field values', () => {
    const alert = {
      kibana: { alert: { rule: { name: 'Array Test' } } },
      event: { category: ['process', 'network'] },
    };

    const features = extractAlertFeatures(alert);
    expect(features.eventCategory).toBe('process, network');
  });

  it('trims whitespace from field values', () => {
    const alert = {
      kibana: { alert: { rule: { name: '  Whitespace Rule  ' } } },
      host: { name: '  WORKSTATION  ' },
    };

    const features = extractAlertFeatures(alert);
    expect(features.ruleName).toBe('Whitespace Rule');
    expect(features.hostName).toBe('WORKSTATION');
  });
});

describe('composeFeatureText', () => {
  it('composes a structured text from features', () => {
    const features = {
      ruleName: 'Suspicious Process Execution',
      ruleDescription: 'Detects bad things',
      severity: 'high',
      riskScore: 73,
      mitreTactics: ['Execution'],
      mitreTechniques: ['Command and Scripting Interpreter'],
      processName: 'powershell.exe',
      processExecutable: undefined,
      processCommandLine: 'powershell -enc abc',
      parentProcessName: 'cmd.exe',
      hostName: 'WORKSTATION-01',
      userName: 'jdoe',
      sourceIp: '10.0.0.5',
      destinationIp: '203.0.113.1',
      fileName: undefined,
      filePath: undefined,
      fileHash: undefined,
      eventCategory: 'process',
      eventAction: 'start',
      networkProtocol: 'tcp',
      dnsQuestionName: undefined,
    };

    const text = composeFeatureText(features);

    expect(text).toContain('Rule: Suspicious Process Execution.');
    expect(text).toContain('Description: Detects bad things.');
    expect(text).toContain('Severity: high.');
    expect(text).toContain('MITRE Tactics: Execution.');
    expect(text).toContain('MITRE Techniques: Command and Scripting Interpreter.');
    expect(text).toContain('Process: name=powershell.exe, cmd=powershell -enc abc.');
    expect(text).toContain('Parent Process: cmd.exe.');
    expect(text).toContain('Host: WORKSTATION-01.');
    expect(text).toContain('User: jdoe.');
    expect(text).toContain('Network: src=10.0.0.5, dst=203.0.113.1, proto=tcp.');
    expect(text).toContain('Event: category=process, action=start.');
  });

  it('omits sections for missing features', () => {
    const features = {
      ruleName: 'Simple Rule',
      mitreTactics: [],
      mitreTechniques: [],
    };

    const text = composeFeatureText(features as AlertFeatures);

    expect(text).toBe('Rule: Simple Rule.');
    expect(text).not.toContain('MITRE');
    expect(text).not.toContain('Process');
    expect(text).not.toContain('Host');
  });
});

describe('hashFeatureText', () => {
  it('returns a consistent SHA-256 hash', () => {
    const text = 'Rule: Test Rule. Host: WORKSTATION-01.';
    const hash1 = hashFeatureText(text);
    const hash2 = hashFeatureText(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('returns different hashes for different text', () => {
    const hash1 = hashFeatureText('Rule: Test Rule A.');
    const hash2 = hashFeatureText('Rule: Test Rule B.');

    expect(hash1).not.toBe(hash2);
  });
});
