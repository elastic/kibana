/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { AddRuleAttachmentToChatButton } from '../../../detection_engine/rule_creation_ui/components/add_rule_attachment_to_chat_button';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { RULE_DETAILS_FOOTER_TEST_ID } from './test_ids';

export interface FooterProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse;
}

export const Footer = memo(({ rule }: FooterProps) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  if (!isAgentChatExperienceEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="center"
      data-test-subj={RULE_DETAILS_FOOTER_TEST_ID}
    >
      <EuiFlexItem grow={false}>
        <AddRuleAttachmentToChatButton rule={rule} pathway="alerts_table_rule_flyout" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Footer.displayName = 'Footer';
