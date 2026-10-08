/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type {
  BriefNarrationMode,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';

interface DebugPanelProps {
  job: ExecutiveBriefJob;
  mode: BriefNarrationMode;
  onModeChange: (mode: BriefNarrationMode) => void;
}

const json = (value: unknown): string => JSON.stringify(value, null, 2);

/** PoC-only debug accordion: snapshot, union-find trace, timings, validation, narration mode (H3). */
export const DebugPanel: React.FC<DebugPanelProps> = ({ job, mode, onModeChange }) => (
  <EuiAccordion
    id="executiveBriefDebugAccordion"
    buttonContent="Debug (PoC)"
    paddingSize="m"
    data-test-subj={TEST_IDS.debugPanel}
  >
    <EuiSwitch
      label="Names only to the LLM (off = ids only; takes effect on Regenerate)"
      checked={mode === 'names'}
      onChange={(event) => onModeChange(event.target.checked ? 'names' : 'ids_only')}
    />
    <EuiSpacer size="m" />
    <EuiText size="xs">
      <h5>{'Timings (ms)'}</h5>
    </EuiText>
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {Object.entries(job.timings ?? {}).map(([stage, ms]) => (
        <EuiFlexItem grow={false} key={stage}>
          <EuiBadge color="hollow">{`${stage}: ${ms}`}</EuiBadge>
        </EuiFlexItem>
      ))}
      {job.tokens && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{`tokens: ${job.tokens.prompt} in / ${job.tokens.completion} out`}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiText size="xs">
      <h5>{'Validation'}</h5>
    </EuiText>
    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
      {json(job.validation ?? null)}
    </EuiCodeBlock>
    <EuiSpacer size="m" />
    <EuiText size="xs">
      <h5>{'Storyline edges and union-find trace'}</h5>
    </EuiText>
    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
      {json({
        edges: job.snapshot?.storylines.storylines.map(({ evidenceId, edges }) => ({
          evidenceId,
          edges,
        })),
        trace: job.snapshot?.storylines.trace,
      })}
    </EuiCodeBlock>
    <EuiSpacer size="m" />
    <EuiText size="xs">
      <h5>{'Snapshot'}</h5>
    </EuiText>
    <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable overflowHeight={400}>
      {json(job.snapshot)}
    </EuiCodeBlock>
  </EuiAccordion>
);
