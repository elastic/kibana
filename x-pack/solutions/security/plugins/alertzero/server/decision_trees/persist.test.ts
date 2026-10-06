/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { persistDecisionTree } from './persist';

const TREE = `flowchart TD
    S1([Script execution]) -->|✅| E1[Query process events]
    E1 -->|✅ encoded command| X1((Encoded PowerShell))`;

describe('persistDecisionTree', () => {
  it('returns a tentative first version for a valid diagram', () => {
    const persisted = persistDecisionTree({
      symptom: 'technique-t1059',
      kiId: 'default:technique-t1059',
      mermaid: TREE,
      applicability: 'Encoded PowerShell on an endpoint',
      evidenceGathererMetadata: ['E1: Process events for the host'],
      keywords: ['powershell'],
    });

    expect(persisted.skipped).toBe(false);
    expect(persisted.status).toBe('tentative');
    expect(persisted.version).toBe(1);
    expect(persisted.type).toBe('security.decision_tree');
    expect(persisted.tag).toBe('decision-tree');
    expect(persisted.title).toBe('Technique T1059');
    expect(persisted.content).toContain('flowchart TD');
    expect(persisted.evidenceGathererMetadata).toEqual(['E1: Process events for the host']);
  });

  it('bumps the version when a prior tree is preserved', () => {
    const persisted = persistDecisionTree({
      symptom: 'technique-t1059',
      kiId: 'default:technique-t1059',
      priorMermaid: TREE,
      priorVersion: 2,
      mermaid: TREE,
    });

    expect(persisted.skipped).toBe(false);
    expect(persisted.version).toBe(3);
  });

  it('skips a draft that drops the existing tree', () => {
    const persisted = persistDecisionTree({
      symptom: 'technique-t1059',
      kiId: 'default:technique-t1059',
      priorMermaid: TREE,
      priorVersion: 1,
      mermaid: 'flowchart TD\n    S1([Unrelated]) -->|✅| X1((Other))',
    });

    expect(persisted.skipped).toBe(true);
    expect(persisted.version).toBe(0);
    expect(persisted.reason.length).toBeGreaterThan(0);
  });

  it('skips a diagram that is not a decision tree', () => {
    const persisted = persistDecisionTree({
      symptom: 'technique-t1059',
      kiId: 'default:technique-t1059',
      mermaid: 'no diagram here',
    });

    expect(persisted.skipped).toBe(true);
  });
});
