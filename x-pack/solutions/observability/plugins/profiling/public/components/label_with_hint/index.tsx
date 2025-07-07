/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiIconProps, EuiTextProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';

interface Props {
  label: string;
  hint: string;
  labelSize?: EuiTextProps['size'];
  labelStyle?: EuiTextProps['style'];
  iconSize?: EuiIconProps['size'];
}

export function LabelWithHint({ label, hint, iconSize, labelSize, labelStyle }: Props) {
  return (
    <EuiFlexGroup gutterSize="xs" style={{ flexGrow: 0 }} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size={labelSize} style={labelStyle}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={hint}>
          <EuiIcon type="question" size={iconSize} />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
