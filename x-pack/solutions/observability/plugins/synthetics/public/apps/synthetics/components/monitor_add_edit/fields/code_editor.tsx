/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import useThrottle from 'react-use/lib/useThrottle';

import { EuiPanel } from '@elastic/eui';
import { CodeEditor as MonacoCodeEditor } from '@kbn/code-editor';
import { css } from '@emotion/react';
import { MonacoEditorLangId } from '../types';
import { useDimensions } from '../../../hooks';

export interface CodeEditorProps {
  ariaLabel: string;
  id: string;
  languageId: MonacoEditorLangId;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
}

export const CodeEditor = ({
  ariaLabel,
  id,
  languageId,
  onChange,
  value,
  placeholder,
  height = '250px',
  readOnly,
}: CodeEditorProps) => {
  const { elementRef: containerRef, width: containerWidth } = useDimensions<HTMLDivElement>();
  const containerWidthThrottled = useThrottle(containerWidth, 500);

  return (
    <>
      <EuiPanel
        panelRef={containerRef as React.Ref<HTMLDivElement>}
        borderRadius="none"
        hasShadow={false}
        hasBorder={true}
        css={css`
          padding: 0;
        `}
      >
        <div
          id={`${id}-editor`}
          aria-label={ariaLabel}
          data-test-subj="codeEditorContainer"
          css={css`
            & > .kibanaCodeEditor {
              z-index: 0;
            }
          `}
        >
          <MonacoCodeEditor
            languageId={languageId}
            width={containerWidthThrottled ?? '100%'}
            height={height}
            value={value}
            onChange={onChange}
            options={{
              renderValidationDecorations: value ? 'on' : 'off',
              readOnly,
            }}
            isCopyable={true}
            allowFullScreen={true}
            placeholder={placeholder}
          />
        </div>
      </EuiPanel>
    </>
  );
};

export const JSONEditor = (props: any) => {
  return <CodeEditor languageId={MonacoEditorLangId.JSON} {...props} />;
};
