/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import { registerYaraLanguage, YARA_LANG_ID } from '../../yara_language';

registerYaraLanguage();

export interface YaraCodeEditorProps
  extends Pick<
    CodeEditorProps,
    'value' | 'onChange' | 'editorDidMount' | 'height' | 'isCopyable' | 'aria-label'
  > {
  readOnly?: boolean;
  /** The editor grows with its content up to this number of lines, then it scrolls. Overrides `height`. */
  maxLines?: number;
  'data-test-subj'?: string;
}

/** Code editor with YARA syntax highlighting and autocomplete. */
export const YaraCodeEditor = memo<YaraCodeEditorProps>(
  ({
    value,
    onChange,
    editorDidMount,
    height,
    isCopyable,
    readOnly = false,
    maxLines,
    'aria-label': ariaLabel,
    'data-test-subj': dataTestSubj,
  }) => {
    const fitToContent = useMemo(
      () => (maxLines === undefined ? undefined : { maxLines }),
      [maxLines]
    );

    const options = useMemo<CodeEditorProps['options']>(
      () => ({
        readOnly,
        domReadOnly: readOnly,
        automaticLayout: true,
      }),
      [readOnly]
    );

    return (
      <CodeEditor
        languageId={YARA_LANG_ID}
        value={value}
        onChange={onChange}
        editorDidMount={editorDidMount}
        width="100%"
        height={height}
        fitToContent={fitToContent}
        isCopyable={isCopyable}
        options={options}
        aria-label={ariaLabel}
        dataTestSubj={dataTestSubj}
        data-test-subj={dataTestSubj}
      />
    );
  }
);
YaraCodeEditor.displayName = 'YaraCodeEditor';
