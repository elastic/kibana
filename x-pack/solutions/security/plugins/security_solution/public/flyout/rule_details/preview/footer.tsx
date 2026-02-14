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
import { useRuleDetailsLink } from '../../document_details/shared/hooks/use_rule_details_link';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { AddRuleAttachmentToChatButton } from '../../../detection_engine/rule_creation_ui/components/add_rule_attachment_to_chat_button';

interface PreviewFooterProps {
  ruleId: string;
  rule: RuleResponse;
}

/**
 * Footer in rule preview panel
 */
export const PreviewFooter = memo(({ ruleId, rule }: PreviewFooterProps) => {
  const href = useRuleDetailsLink({ ruleId });

  return (
    <FlyoutFooter data-test-subj={RULE_PREVIEW_FOOTER_TEST_ID}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <AddRuleAttachmentToChatButton
            rule={rule}
            size="s"
            pathway="alerts_flyout"
            mode="exploration"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {href ? (
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
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
});

PreviewFooter.displayName = 'PreviewFooter';
