/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '../../../common/api/detection_engine';
import { useRuleDetailsLink } from './hooks/use_rule_details_link';
import { AddRuleAttachmentToChatButton } from '../../detection_engine/rule_creation_ui/components/add_rule_attachment_to_chat_button';
import { useAgentBuilderAvailability } from '../../agent_builder/hooks/use_agent_builder_availability';
import { RULE_DETAILS_FOOTER_TEST_ID, RULE_DETAILS_FOOTER_LINK_TEST_ID } from './test_ids';

export interface FooterProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse;
}

export const Footer = memo(({ rule }: FooterProps) => {
  const href = useRuleDetailsLink({ ruleId: rule.id });
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const showAddToChat = isAgentChatExperienceEnabled;
  const showLink = !!href;

  if (!showAddToChat && !showLink) {
    return null;
  }

  return (
    <EuiFlyoutFooter data-test-subj={RULE_DETAILS_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent={showAddToChat ? 'spaceBetween' : 'center'} alignItems="center">
        {showAddToChat ? (
          <EuiFlexItem grow={false}>
            <AddRuleAttachmentToChatButton rule={rule} pathway="alerts_table_rule_flyout" />
          </EuiFlexItem>
        ) : null}
        {showLink ? (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={href}
              target="_blank"
              external={false}
              data-test-subj={RULE_DETAILS_FOOTER_LINK_TEST_ID}
            >
              {i18n.translate('xpack.securitySolution.flyout.ruleDetails.viewDetailsLabel', {
                defaultMessage: 'Show full rule details',
              })}
            </EuiLink>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
});

Footer.displayName = 'Footer';
