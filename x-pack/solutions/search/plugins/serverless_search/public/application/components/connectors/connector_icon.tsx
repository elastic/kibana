/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiIcon } from '@elastic/eui';

export const ConnectorIcon: React.FC<{ name: string; serviceType: string; iconPath?: string }> = ({
  name,
  serviceType,
  iconPath,
}) => (
  <EuiToolTip content={name}>
    <EuiIcon size="l" title={name} id={serviceType} type={iconPath || 'defaultIcon'} />
  </EuiToolTip>
);
