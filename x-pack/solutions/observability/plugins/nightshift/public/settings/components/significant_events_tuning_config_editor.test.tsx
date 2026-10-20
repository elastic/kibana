/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/significant-events-schema';
import {
  SignificantEventsTuningConfigEditor,
  configToAnnotatedYaml,
} from './significant_events_tuning_config_editor';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    height,
    fitToContent,
    options,
    value,
  }: {
    height?: string | number;
    fitToContent?: { minLines?: number; maxLines?: number };
    options?: { scrollbar?: { vertical?: string } };
    value: string;
  }) => (
    <div
      data-test-subj="tuning-yaml-code-editor"
      data-height={height === undefined ? '' : String(height)}
      data-fit-to-content={JSON.stringify(fitToContent ?? null)}
      data-vertical-scrollbar={options?.scrollbar?.vertical ?? ''}
    >
      {value}
    </div>
  ),
}));

describe('SignificantEventsTuningConfigEditor', () => {
  it('grows to show the full YAML without a nested vertical scrollbar', () => {
    const value = configToAnnotatedYaml(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);

    render(
      <I18nProvider>
        <SignificantEventsTuningConfigEditor value={value} onChange={jest.fn()} />
      </I18nProvider>
    );

    const editor = screen.getByTestId('tuning-yaml-code-editor');
    expect(editor).toHaveTextContent('sample_size');
    expect(editor).toHaveAttribute('data-height', '');
    expect(JSON.parse(editor.getAttribute('data-fit-to-content')!)).toEqual({ minLines: 1 });
    expect(editor).toHaveAttribute('data-vertical-scrollbar', 'hidden');
  });
});
