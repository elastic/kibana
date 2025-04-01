/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiIcon } from '@elastic/eui';

interface ConnectorIconProps {
  name: string;
  serviceType: string;
  iconPath?: string;
  showTooltip?: boolean;
}

export const ConnectorIcon: React.FC<ConnectorIconProps> = ({
  name,
  serviceType,
  iconPath,
  showTooltip = true,
}) => {
  const icon = <EuiIcon size="l" title={name} id={serviceType} type={iconPath || 'defaultIcon'} />;

  return showTooltip ? <EuiToolTip content={name}>{icon}</EuiToolTip> : icon;
};
