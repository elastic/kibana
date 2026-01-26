/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonColor } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import type { EuiButtonEmptySizes } from '@elastic/eui/src/components/button/button_empty/button_empty';
import { agentBuilderIconType } from '@kbn/agent-builder-plugin/public';
import type { AgentBuilderAddToChatTelemetry } from '../hooks/use_report_add_to_chat';
import { useReportAddToChat } from '../hooks/use_report_add_to_chat';
import * as i18n from './translations';
import { useAgentBuilderAvailability } from '../hooks/use_agent_builder_availability';

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
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Telemetry data for tracking "Add to Chat" clicks
   */
  telemetry?: AgentBuilderAddToChatTelemetry;
}

/**
 * `NewAgentBuilderAttachment` displays a button that opens the agent builder flyout
 * with attachment data. You may optionally override the default text.
 */
export const NewAgentBuilderAttachment = memo(function NewAgentBuilderAttachment({
  color = 'primary',
  onClick,
  size = 'm',
  disabled = false,
  telemetry: telemetryData,
}: NewAgentBuilderAttachmentProps) {
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled, hasValidAgentBuilderLicense } =
    useAgentBuilderAvailability();
  const reportAddToChatClick = useReportAddToChat();

  const handleClick = useCallback(() => {
    if (telemetryData) {
      reportAddToChatClick({
        pathway: telemetryData.pathway,
        attachments: telemetryData.attachments,
      });
    }
    onClick();
  }, [onClick, reportAddToChatClick, telemetryData]);

  const isDisabled = disabled || !hasValidAgentBuilderLicense;
  const shouldShowLicenseTooltip = !hasValidAgentBuilderLicense;

  if (!hasAgentBuilderPrivilege || !isAgentChatExperienceEnabled) {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      aria-label={i18n.ADD_TO_CHAT}
      color={color}
      data-test-subj="newAgentBuilderAttachment"
      onClick={handleClick}
      size={size}
      disabled={isDisabled}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type={agentBuilderIconType} color={color === 'primary' ? 'default' : color} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{i18n.ADD_TO_CHAT}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );

  if (!shouldShowLicenseTooltip) {
    return button;
  }

  return (
    <EuiToolTip content={i18n.UPGRADE_TO_ENTERPRISE_TO_USE_AGENT_BUILDER_CHAT}>
      <span>{button}</span>
    </EuiToolTip>
  );
});
