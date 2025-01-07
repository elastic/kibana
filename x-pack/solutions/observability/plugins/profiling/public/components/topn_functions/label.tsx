/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import React from 'react';
import { getColorLabel } from './utils';

interface Props {
  value: number;
  append?: string;
  prepend?: string;
}

export function Label({ value, prepend, append }: Props) {
  const { label, color, icon } = getColorLabel(value);
  return (
    <EuiTextColor color={color}>
      {prepend}
      {icon && <EuiIcon type={icon} size="s" color={color} />}
      {label}
      {append}
    </EuiTextColor>
  );
}
