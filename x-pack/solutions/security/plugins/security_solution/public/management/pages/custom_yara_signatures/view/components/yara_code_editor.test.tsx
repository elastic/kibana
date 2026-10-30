/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CodeEditorProps } from '@kbn/code-editor';
import { monaco } from '@kbn/code-editor';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { YARA_LANG_ID } from '../../yara_language';
import { YaraCodeEditor } from './yara_code_editor';

const mockCodeEditor = jest.fn((props: CodeEditorProps) => <div>{props.value}</div>);

jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: (props: CodeEditorProps) => mockCodeEditor(props),
}));

describe('YaraCodeEditor', () => {
  const signature = 'rule test_rule { condition: true }';
  const render = (ui: React.ReactElement) => createAppRootMockRenderer().render(ui);

  beforeEach(() => {
    mockCodeEditor.mockClear();
  });

  it('should register the YARA language', () => {
    expect(monaco.languages.getLanguages()).toContainEqual(
      expect.objectContaining({ id: YARA_LANG_ID })
    );
  });

  it('should render an editable code editor with YARA highlighting', () => {
    const onChange = jest.fn();
    const editorDidMount = jest.fn();
    const { getByText } = render(
      <YaraCodeEditor
        value={signature}
        onChange={onChange}
        editorDidMount={editorDidMount}
        height={300}
        aria-label="Signature"
        data-test-subj="yaraEditor"
      />
    );

    expect(getByText(signature)).toBeInTheDocument();
    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        languageId: YARA_LANG_ID,
        value: signature,
        onChange,
        editorDidMount,
        height: 300,
        fitToContent: undefined,
        isCopyable: undefined,
        options: expect.objectContaining({
          readOnly: false,
          domReadOnly: false,
        }),
        'aria-label': 'Signature',
        dataTestSubj: 'yaraEditor',
      })
    );
  });

  it('should render a read-only code editor that fits its content', () => {
    render(<YaraCodeEditor value={signature} readOnly isCopyable maxLines={10} />);

    expect(mockCodeEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        fitToContent: { maxLines: 10 },
        isCopyable: true,
        options: expect.objectContaining({ readOnly: true, domReadOnly: true }),
      })
    );
  });
});
