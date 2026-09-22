/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';

interface AddToChatPlaceholderButtonProps {
  /**
   * Button label text
   */
  label: string;
  /**
   * Tooltip content explaining why the button is disabled
   */
  tooltipContent: string;
}

/**
 * A disabled "Add to chat" button wrapped in a tooltip, shown when the agent builder
 * is unavailable (no privilege or agent mode not enabled).
 */
export const AddToChatPlaceholderButton = memo<AddToChatPlaceholderButtonProps>(
  ({ label, tooltipContent }) => (
    <EuiToolTip content={tooltipContent}>
      <AiButton variant="empty" iconType="productAgent" isDisabled>
        {label}
      </AiButton>
    </EuiToolTip>
  )
);

AddToChatPlaceholderButton.displayName = 'AddToChatPlaceholderButton';
