/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiIconTip } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';

enum MessageLevels {
  info = 'info',
  warning = 'warning',
  error = 'error',
}

interface MlAuditIconProps {
  message: MlSummaryJob['auditMessage'];
}

const MlAuditIconComponent: FC<MlAuditIconProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  let color = 'primary';
  let icon = 'warning';

  if (message.level === MessageLevels.info) {
    icon = 'info';
  } else if (message.level === MessageLevels.warning) {
    color = 'warning';
  } else if (message.level === MessageLevels.error) {
    color = 'danger';
  }

  return (
    <EuiIconTip
      content={message.text}
      type={icon}
      color={color}
      iconProps={{
        'data-test-subj': 'mlJobAuditIcon',
      }}
    />
  );
};

export const MlAuditIcon = memo(MlAuditIconComponent);
