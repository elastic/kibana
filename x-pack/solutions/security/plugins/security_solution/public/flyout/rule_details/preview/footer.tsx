/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { RULE_PREVIEW_FOOTER_TEST_ID, RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID } from './test_ids';
import { useRuleDetailsLink } from '../../../flyout_v2/rule/hooks/use_rule_details_link';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { AddRuleAttachmentToChatButton } from '../../../detection_engine/rule_creation_ui/components/add_rule_attachment_to_chat_button';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';

interface PreviewFooterProps {
  rule: RuleResponse;
  isPreviewMode?: boolean;
}

/**
 * Footer in rule preview panel
 */
export const PreviewFooter = memo(({ rule, isPreviewMode }: PreviewFooterProps) => {
  const href = useRuleDetailsLink({ ruleId: rule.id });
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const showAddToChat = isAgentChatExperienceEnabled;
  const showLink = isPreviewMode && !!href;

  if (!showAddToChat && !showLink) {
    return null;
  }

  return (
    <FlyoutFooter data-test-subj={RULE_PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent={showAddToChat ? 'spaceBetween' : 'center'} alignItems="center">
        {showAddToChat ? (
          <EuiFlexItem grow={false}>
            <AddRuleAttachmentToChatButton
              rule={rule}
              pathway={isPreviewMode ? 'alerts_flyout_rule_summary' : 'alerts_table_rule_flyout'}
            />
          </EuiFlexItem>
        ) : null}
        {showLink ? (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={href}
              target="_blank"
              external={false}
              data-test-subj={RULE_PREVIEW_OPEN_RULE_FLYOUT_TEST_ID}
            >
              {i18n.translate('xpack.securitySolution.flyout.preview.rule.viewDetailsLabel', {
                defaultMessage: 'Show full rule details',
              })}
            </EuiLink>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </FlyoutFooter>
  );
});

PreviewFooter.displayName = 'PreviewFooter';
