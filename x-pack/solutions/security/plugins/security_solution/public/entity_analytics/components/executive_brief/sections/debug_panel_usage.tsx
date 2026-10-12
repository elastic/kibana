/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';

export const USAGE_TEST_IDS = {
  block: 'executiveBriefDebugUsage',
  footerLine: 'executiveBriefUsageLine',
} as const;

/** 18 -> "18", 18234 -> "18.2k". */
export const formatTokens = (count: number): string =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(Math.round(count));

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

/** The small footer line: actual tokens for an AI run, the would-send estimate for the template. */
export const getUsageLine = (job: ExecutiveBriefJob, modelLabel?: string): string | undefined => {
  const { tokens, estimate } = job;
  if (tokens) {
    const total = tokens.total ?? tokens.prompt + tokens.completion;
    return `≈ ${formatTokens(total)} tokens${modelLabel ? ` · ${modelLabel}` : ''}`;
  }
  if (estimate) {
    return `Template · would send ≈ ${formatTokens(estimate.promptTokens)} tokens`;
  }
  return undefined;
};

/** Debug panel "Usage" block: pre-call estimate, actual tokens, attempts, generate time, model. */
export const UsageBlock: React.FC<{ job: ExecutiveBriefJob }> = ({ job }) => {
  const { estimate, tokens, attempts, timings, model } = job;
  const items = [
    ...(estimate
      ? [
          {
            title: 'Estimated prompt tokens',
            description: `${estimate.promptTokens.toLocaleString()} (${estimate.method})`,
          },
          { title: 'Payload size', description: formatKb(estimate.payloadBytes) },
        ]
      : []),
    ...(tokens
      ? [
          { title: 'Prompt tokens', description: tokens.prompt.toLocaleString() },
          { title: 'Completion tokens', description: tokens.completion.toLocaleString() },
          ...(tokens.cached !== undefined
            ? [{ title: 'Cached tokens', description: tokens.cached.toLocaleString() }]
            : []),
          ...(tokens.total !== undefined
            ? [{ title: 'Total tokens', description: tokens.total.toLocaleString() }]
            : []),
        ]
      : []),
    ...(attempts !== undefined ? [{ title: 'Attempts', description: String(attempts) }] : []),
    ...(timings?.generate !== undefined
      ? [{ title: 'Generate stage', description: `${timings.generate} ms` }]
      : []),
    ...(model ? [{ title: 'Model', description: model }] : []),
  ];

  return (
    <div data-test-subj={USAGE_TEST_IDS.block}>
      <EuiText size="xs">
        <h5>{'Usage'}</h5>
      </EuiText>
      {items.length > 0 ? (
        <EuiDescriptionList type="column" compressed listItems={items} />
      ) : (
        <EuiText size="xs" color="subdued">
          {'No usage recorded'}
        </EuiText>
      )}
    </div>
  );
};
