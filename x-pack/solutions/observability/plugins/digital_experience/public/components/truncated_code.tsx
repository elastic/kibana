/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiText } from '@elastic/eui';

/** A value in code font on one line, e.g. a URL in a table cell, with the whole value as its title. */
export function TruncatedCode({ value, title = value }: { value: string; title?: string }) {
  return (
    <EuiText size="xs" className="eui-textTruncate" title={title}>
      <EuiCode transparentBackground>{value}</EuiCode>
    </EuiText>
  );
}
