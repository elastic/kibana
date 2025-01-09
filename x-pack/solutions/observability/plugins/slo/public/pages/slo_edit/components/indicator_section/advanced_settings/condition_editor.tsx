/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { CodeEditor as MonacoCodeEditor } from '@kbn/code-editor';
import { PainlessLang } from '@kbn/monaco';
import { EuiPanel } from '@elastic/eui';

export interface CodeEditorProps {
  onChange: (value: string) => void;
  value: string;
}

export function CodeEditor({ onChange, value }: CodeEditorProps) {
  const suggestionProvider = PainlessLang.getSuggestionProvider('processor_conditional');

  return (
    <EuiPanel borderRadius="none" hasShadow={false} hasBorder={true} paddingSize="none">
      <MonacoCodeEditor
        signatureProvider={suggestionProvider}
        languageId={PainlessLang.ID}
        width={'100%'}
        height={'120px'}
        value={value}
        onChange={onChange}
        options={{
          renderValidationDecorations: value ? 'on' : 'off',
          lineNumbers: 'off',
          minimap: { enabled: false },
        }}
        isCopyable={true}
        placeholder={
          "def hour = ZonedDateTime.parse(ctx['@timestamp']).getHour(); \n" +
          'return hour < 9 || hour >= 17'
        }
      />
    </EuiPanel>
  );
}
