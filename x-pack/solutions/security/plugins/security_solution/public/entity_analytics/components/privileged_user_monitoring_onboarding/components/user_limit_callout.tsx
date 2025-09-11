/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserLimitCallOut as BaseUserLimitCallOut } from '../../user_limit_callout';

export const UserLimitCallOut: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  return <BaseUserLimitCallOut variant={variant} />;
};
