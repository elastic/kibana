/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextTruncate, useEuiTheme } from '@elastic/eui';

/**
 * A URL in code font on one line, truncated in the middle so its host and file stay visible, with
 * the whole URL in a tooltip when cut.
 */
export function TruncatedUrl({ url }: { url: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    // Fills its cell: `EuiTextTruncate` fits the text to the width it measures.
    <EuiText
      size="xs"
      className="eui-textTruncate"
      css={{ width: '100%', fontFamily: euiTheme.font.familyCode }}
    >
      <EuiTextTruncate text={url} truncation="middle" />
    </EuiText>
  );
}
