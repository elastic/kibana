/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonColor } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React, { memo } from 'react';
import type { EuiButtonEmptySizes } from '@elastic/eui/src/components/button/button_empty/button_empty';
import { onechatIconType } from '@kbn/onechat-plugin/public';
import * as i18n from './translations';

export interface NewAgentBuilderAttachmentProps {
  /**
   * Optionally specify color of empty button.
   * @default 'primary'
   */
  color?: EuiButtonColor;
  /**
   * Callback when button is clicked
   */
  onClick: () => void;
  /**
   * Size of the button
   */
  size?: EuiButtonEmptySizes;
}

/**
 * `NewAgentBuilderAttachment` displays a button that opens the agent builder flyout
 * with attachment data. You may optionally override the default text.
 */
export const NewAgentBuilderAttachment = memo(function NewAgentBuilderAttachment({
  color = 'primary',
  onClick,
  size = 'm',
}: NewAgentBuilderAttachmentProps) {
  return (
    <EuiButtonEmpty
      aria-label={i18n.ADD_TO_CHAT}
      color={color}
      data-test-subj={'newAgentBuilderAttachment'}
      onClick={onClick}
      size={size}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type={onechatIconType} color={color === 'primary' ? 'default' : color} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{i18n.ADD_TO_CHAT}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );
});
