/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import { DebugPanel } from './debug_panel';
import { USAGE_TEST_IDS, getUsageLine } from './debug_panel_usage';

const renderPanel = (job: ExecutiveBriefJob) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <DebugPanel job={job} mode="names" onModeChange={jest.fn()} />
      </I18nProvider>
    </EuiProvider>
  );

const base: ExecutiveBriefJob = {
  ...FIXTURE_JOB_SUCCEEDED,
  tokens: undefined,
  estimate: undefined,
  attempts: undefined,
  model: undefined,
  timings: { generate: 4321 },
};

describe('DebugPanel usage block', () => {
  it('shows the estimate, actual tokens, attempts, generate time and model', () => {
    renderPanel({
      ...base,
      estimate: { promptTokens: 17900, payloadBytes: 20480, method: 'tokenizer' },
      tokens: { prompt: 18000, completion: 1200, cached: 500, total: 19200 },
      attempts: 2,
      model: 'Claude Sonnet 5',
    });
    const text = screen.getByTestId(USAGE_TEST_IDS.block).textContent ?? '';
    expect(text).toContain('17,900 (tokenizer)');
    expect(text).toContain('20.0 KB');
    expect(text).toContain('18,000');
    expect(text).toContain('1,200');
    expect(text).toContain('500');
    expect(text).toContain('19,200');
    expect(text).toContain('Attempts');
    expect(text).toContain('4321 ms');
    expect(text).toContain('Claude Sonnet 5');
  });

  it('shows only the estimate when there are no tokens (template)', () => {
    renderPanel({
      ...base,
      estimate: { promptTokens: 8500, payloadBytes: 2048, method: 'chars_div_4' },
    });
    const text = screen.getByTestId(USAGE_TEST_IDS.block).textContent ?? '';
    expect(text).toContain('8,500 (chars_div_4)');
    expect(text).not.toContain('Completion tokens');
    expect(text).not.toContain('Attempts');
  });

  it('says nothing was recorded when there is neither', () => {
    renderPanel({ ...base, timings: undefined });
    expect(screen.getByTestId(USAGE_TEST_IDS.block)).toHaveTextContent('No usage recorded');
  });
});

describe('getUsageLine', () => {
  it('falls back to prompt + completion when total is missing and omits an empty model', () => {
    expect(getUsageLine({ ...base, tokens: { prompt: 900, completion: 100 } })).toBe(
      '≈ 1.0k tokens'
    );
  });

  it('is undefined with neither tokens nor estimate', () => {
    expect(getUsageLine(base)).toBeUndefined();
  });
});
