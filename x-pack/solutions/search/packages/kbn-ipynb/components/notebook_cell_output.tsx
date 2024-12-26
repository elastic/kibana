/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

import { NotebookOutputType } from '../types';
import { isDefined, isDefinedAndHasValue, combineSource } from '../utils';

export const NotebookCellOutput = ({ output }: { output: NotebookOutputType }) => {
  if (isDefined(output.text) && output.text.length > 0) {
    return <EuiCodeBlock>{combineSource(output.text)}</EuiCodeBlock>;
  }
  if (isDefinedAndHasValue(output.png)) {
    return <OutputPng value={output.png} />;
  }
  if (isDefinedAndHasValue(output.jpeg)) {
    return <OutputJpeg value={output.jpeg} />;
  }
  if (isDefinedAndHasValue(output.gif)) {
    return <OutputGif value={output.gif} />;
  }
  if (!isDefined(output.data)) return null;
  if (isDefined(output.data['text/plain'])) {
    return <EuiCodeBlock>{combineSource(output.data['text/plain'])}</EuiCodeBlock>;
  }
  if (isDefinedAndHasValue(output.data['image/png'])) {
    return <OutputPng value={output.data['image/png']} />;
  }
  if (isDefinedAndHasValue(output.data['image/jpeg'])) {
    return <OutputJpeg value={output.data['image/jpeg']} />;
  }
  if (isDefinedAndHasValue(output.data['image/gif'])) {
    return <OutputGif value={output.data['image/gif']} />;
  }
  if (isDefined(output.data['text/html'])) {
    // We just present HTML instead of rendering it for safety
    return <EuiCodeBlock lineNumbers>{combineSource(output.data['text/html'])}</EuiCodeBlock>;
  }
  if (isDefined(output.data['application/javascript'])) {
    // We just present JS instead of rendering it for safety
    return (
      <EuiCodeBlock lineNumbers>
        {combineSource(output.data['application/javascript'])}
      </EuiCodeBlock>
    );
  }
  if (isDefined(output.data['text/latex'])) {
    return <EuiCodeBlock lineNumbers>{combineSource(output.data['text/latex'])}</EuiCodeBlock>;
  }

  return null;
};

const OutputImage = ({ value, type }: { value: string; type: 'png' | 'jpeg' | 'gif' }) => (
  <img
    src={`data:image/${type};base64,${value}`}
    alt={`output ${type} image`}
    style={{ maxHeight: '400px', maxWidth: '400px' }}
  />
);
const OutputPng = ({ value }: { value: string }) => <OutputImage value={value} type="png" />;
const OutputJpeg = ({ value }: { value: string }) => <OutputImage value={value} type="jpeg" />;
const OutputGif = ({ value }: { value: string }) => <OutputImage value={value} type="gif" />;
