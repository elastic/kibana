/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { GraphNotificationBadge } from '../graph_notification_badge';

interface ToolShortcutTooltipProps {
  label: string;
  shortcut: string;
}

export const ToolShortcutTooltip = ({ label, shortcut }: ToolShortcutTooltipProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css({
        display: 'inline-flex',
        alignItems: 'center',
        gap: euiTheme.size.s,
      })}
    >
      <span>{label}</span>
      <GraphNotificationBadge color="subdued" size="s">
        {shortcut}
      </GraphNotificationBadge>
    </span>
  );
};
