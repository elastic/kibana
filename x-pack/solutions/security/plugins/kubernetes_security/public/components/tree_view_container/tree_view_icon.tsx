/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { useEuiTheme } from '../../hooks';
import { TreeViewIconProps } from '../../types';

export const TreeViewIcon = ({ euiVarColor, ...props }: TreeViewIconProps) => {
  const { euiVars } = useEuiTheme();

  const colorStyle = euiVars[euiVarColor] ? { style: { color: euiVars[euiVarColor] } } : {};

  return <EuiIcon {...props} {...colorStyle} />;
};
