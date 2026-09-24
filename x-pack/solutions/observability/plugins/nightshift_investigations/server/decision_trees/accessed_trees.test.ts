/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import {
  embedAccessedTreesMarker,
  extractAccessedTreeIds,
  parseAccessedTreesMarker,
} from './accessed_trees';

describe('extractAccessedTreeIds', () => {
  it('returns tree ids the investigator opened with view_file', () => {
    expect(
      extractAccessedTreeIds([
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/decision-trees/decision_tree_checkout-high-latency.md' },
        },
      ])
    ).toEqual(['symptom:checkout-high-latency']);
  });

  it('ignores monitors.md and unrelated files', () => {
    expect(
      extractAccessedTreeIds([
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/decision-trees/monitors.md' },
        },
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/cortex/INDEX.md' },
        },
      ])
    ).toEqual([]);
  });

  it('picks tree files out of a bash command', () => {
    expect(
      extractAccessedTreeIds([
        {
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: { command: 'cat /workspace/decision-trees/decision_tree_payment-errors.md' },
        },
      ])
    ).toEqual(['symptom:payment-errors']);
  });

  it('deduplicates repeated reads of the same tree', () => {
    expect(
      extractAccessedTreeIds([
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: 'decision-trees/decision_tree_checkout-high-latency.md' },
        },
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/decision-trees/decision_tree_checkout-high-latency.md' },
        },
      ])
    ).toEqual(['symptom:checkout-high-latency']);
  });
});

describe('accessed-trees marker', () => {
  it('round-trips an empty access list so hydrate writes no trees', () => {
    const marker = embedAccessedTreesMarker([]);
    expect(parseAccessedTreesMarker(`${marker}\nhello`)).toEqual([]);
  });

  it('round-trips accessed tree ids', () => {
    const marker = embedAccessedTreesMarker(['symptom:checkout-high-latency']);
    expect(parseAccessedTreesMarker(marker)).toEqual(['symptom:checkout-high-latency']);
  });

  it('treats a prompt with no marker as unrestricted hydrate', () => {
    expect(parseAccessedTreesMarker('Why is checkout slow?')).toBeUndefined();
  });
});
