/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatInvestigationAsMarkdown,
  formatTriageSummary,
  formatMitreSummary,
} from './format_investigation';
import type { InvestigationResult, TriageResult, MitreMapping } from '../types';

describe('formatInvestigationAsMarkdown', () => {
  it('should format complete investigation result with all sections', () => {
    const result: InvestigationResult = {
      alertId: 'alert-123',
      caseId: 'case-456',
      timestamp: '2026-03-22T10:00:00Z',
      triage: {
        classification: 'HIGH',
        attackType: 'Lateral Movement',
        confidence: 85,
        reasoning: 'User executed commands on multiple hosts',
        similarAlertsCount: 5,
      },
      mitreMapping: {
        techniques: [
          { id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' },
          { id: 'T1021.002', name: 'SMB/Windows Admin Shares', confidence: 'MEDIUM' },
        ],
        tactics: [
          { id: 'TA0002', name: 'Execution' },
          { id: 'TA0008', name: 'Lateral Movement' },
        ],
        phase: 'Lateral Movement',
        confidence: 'HIGH',
        reasoning: 'PowerShell with remote service access',
      },
      investigationText: '',
      latencyMs: 15000,
    };

    const markdown = formatInvestigationAsMarkdown(result);

    expect(markdown).toContain('## 🤖 AI-Powered Alert Investigation');
    expect(markdown).toContain('**Alert ID:** alert-123');
    expect(markdown).toContain('**Investigation Time:** 15000ms');
    expect(markdown).toContain('### 🎯 Triage Classification');
    expect(markdown).toContain('**Severity:** HIGH');
    expect(markdown).toContain('**Attack Type:** Lateral Movement');
    expect(markdown).toContain('**Confidence:** 85%');
    expect(markdown).toContain('**Similar Alerts:** 5 found');
    expect(markdown).toContain('### 🎭 MITRE ATT&CK Mapping');
    expect(markdown).toContain('**T1059.001** - PowerShell (HIGH confidence)');
    expect(markdown).toContain('Execution (TA0002)');
    expect(markdown).toContain('**Attack Phase:** Lateral Movement');
  });

  it('should format investigation with only triage result', () => {
    const result: InvestigationResult = {
      alertId: 'alert-123',
      timestamp: '2026-03-22T10:00:00Z',
      triage: {
        classification: 'MEDIUM',
        attackType: 'Unknown',
        confidence: 60,
        reasoning: 'Insufficient information',
      },
      investigationText: '',
      latencyMs: 5000,
    };

    const markdown = formatInvestigationAsMarkdown(result);

    expect(markdown).toContain('### 🎯 Triage Classification');
    expect(markdown).toContain('**Severity:** MEDIUM');
    expect(markdown).not.toContain('### 🎭 MITRE ATT&CK Mapping');
  });

  it('should handle missing optional fields gracefully', () => {
    const result: InvestigationResult = {
      alertId: 'alert-123',
      timestamp: '2026-03-22T10:00:00Z',
      investigationText: '',
      latencyMs: 1000,
    };

    const markdown = formatInvestigationAsMarkdown(result);

    expect(markdown).toContain('## 🤖 AI-Powered Alert Investigation');
    expect(markdown).toContain('**Alert ID:** alert-123');
    expect(markdown).not.toContain('### 🎯 Triage Classification');
    expect(markdown).not.toContain('### 🎭 MITRE ATT&CK Mapping');
  });
});

describe('formatTriageSummary', () => {
  it('should format triage summary concisely', () => {
    const triage: TriageResult = {
      classification: 'CRITICAL',
      attackType: 'Malware',
      confidence: 95,
      reasoning: 'Ransomware detected',
    };

    const summary = formatTriageSummary(triage);

    expect(summary).toBe('[CRITICAL] Malware (95% confidence)');
  });

  it('should handle LOW severity', () => {
    const triage: TriageResult = {
      classification: 'LOW',
      attackType: 'Unknown',
      confidence: 40,
      reasoning: 'Likely false positive',
    };

    const summary = formatTriageSummary(triage);

    expect(summary).toBe('[LOW] Unknown (40% confidence)');
  });
});

describe('formatMitreSummary', () => {
  it('should format MITRE summary with techniques', () => {
    const mapping: MitreMapping = {
      techniques: [
        { id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' },
        { id: 'T1021.002', name: 'SMB', confidence: 'HIGH' },
      ],
      tactics: [{ id: 'TA0002', name: 'Execution' }],
      phase: 'Execution',
      confidence: 'HIGH',
      reasoning: 'PowerShell execution observed',
    };

    const summary = formatMitreSummary(mapping);

    expect(summary).toBe('Execution - Techniques: T1059.001, T1021.002');
  });

  it('should handle single technique', () => {
    const mapping: MitreMapping = {
      techniques: [{ id: 'T1486', name: 'Data Encrypted for Impact', confidence: 'HIGH' }],
      tactics: [{ id: 'TA0040', name: 'Impact' }],
      phase: 'Impact',
      confidence: 'HIGH',
      reasoning: 'Ransomware encryption',
    };

    const summary = formatMitreSummary(mapping);

    expect(summary).toBe('Impact - Techniques: T1486');
  });
});
