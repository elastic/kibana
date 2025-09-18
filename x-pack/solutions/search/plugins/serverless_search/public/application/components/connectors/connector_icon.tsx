/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';

export const ConnectorIcon: React.FC<{ name: string; serviceType: string; iconPath?: string }> = ({
  name,
  serviceType,
  iconPath,
}) => (
  <EuiIconTip
    content={name}
    type={iconPath || 'defaultIcon'}
    size="l"
    title={name}
    id={serviceType}
  />
);
