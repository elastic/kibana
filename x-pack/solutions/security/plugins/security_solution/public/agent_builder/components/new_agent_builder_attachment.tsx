/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonColor } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React from 'react';
import type { EuiButtonEmptySizes } from '@elastic/eui/src/components/button/button_empty/button_empty';
import * as i18n from './translations';

export const BUTTON_TEST_ID = 'newAgentBuilderAttachment';
export const BUTTON_ICON_TEST_ID = 'newAgentBuilderAttachmentIcon';
export const BUTTON_TEXT_TEST_ID = 'newAgentBuilderAttachmentText';

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

const NewAgentBuilderAttachmentComponent: React.FC<NewAgentBuilderAttachmentProps> = ({
  color = 'primary',
  onClick,
  size = 'm',
}) => {
  return (
    <EuiButtonEmpty
      aria-label={i18n.VIEW_IN_AGENT_BUILDER}
      color={color}
      data-test-subj={'newAgentBuilderAttachment'}
      onClick={onClick}
      size={size}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="machineLearningApp" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{i18n.VIEW_IN_AGENT_BUILDER}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );
};

NewAgentBuilderAttachmentComponent.displayName = 'NewAgentBuilderAttachmentComponent';

/**
 * `NewAgentBuilderAttachment` displays a button that opens the agent builder flyout
 * with attachment data. You may optionally override the default text.
 */
export const NewAgentBuilderAttachment = React.memo(NewAgentBuilderAttachmentComponent);
