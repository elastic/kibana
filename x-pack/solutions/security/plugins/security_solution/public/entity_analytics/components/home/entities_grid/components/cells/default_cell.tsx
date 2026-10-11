/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ellipsisCss } from './styles';

export const DefaultCell = memo(({ value }: { value: unknown }) => {
  const text = Array.isArray(value) ? value.map((v) => String(v)).join(', ') : String(value ?? '—');
  return <div css={ellipsisCss}>{text}</div>;
});
DefaultCell.displayName = 'DefaultCell';
