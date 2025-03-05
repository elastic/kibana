/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { IconAiForTheSocLazy } from '../../common/lazy_icons';

export const AiForTheSocIcon = ({ size = 'l', ...rest }: EuiIconProps) => {
  return <EuiIcon {...{ type: IconAiForTheSocLazy, size, ...rest }} />;
};
