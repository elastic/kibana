/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLink,
} from '@elastic/eui';
import { DELETED_RULE } from '../../detection_engine/rule_details_ui/pages/rule_details/translations';
import { CreatedBy, UpdatedBy } from '../../detections/components/rules/rule_info';
import type { RuleResponse } from '../../../common/api/detection_engine';
import { useRuleDetailsLink } from './hooks/use_rule_details_link';
import { FlyoutTitle } from '../shared/components/flyout_title';
import {
  RULE_DETAILS_TITLE_TEST_ID,
  RULE_DETAILS_TITLE_LINK_TEST_ID,
  RULE_DETAILS_SUPPRESSED_TEST_ID,
  RULE_DETAILS_CREATED_BY_TEST_ID,
  RULE_DETAILS_UPDATED_BY_TEST_ID,
} from './test_ids';

const urlParamOverride = { timeline: { isOpen: false } };

export interface HeaderProps {
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse;
  /**
   * Whether the rule has been deleted. When true, a "Deleted rule" badge is shown.
   * */
  isSuppressed: boolean;
}

export const Header: React.FC<HeaderProps> = memo(({ rule, isSuppressed }) => {
  const href = useRuleDetailsLink({ ruleId: rule.id }, urlParamOverride);

  return (
    <>
      {href ? (
        <EuiLink
          href={href}
          target="_blank"
          external={false}
          data-test-subj={RULE_DETAILS_TITLE_LINK_TEST_ID}
        >
          <FlyoutTitle
            title={rule.name}
            iconType="warning"
            isLink
            data-test-subj={RULE_DETAILS_TITLE_TEST_ID}
          />
        </EuiLink>
      ) : (
        <EuiTitle>
          <h6 data-test-subj={RULE_DETAILS_TITLE_TEST_ID}>{rule.name}</h6>
        </EuiTitle>
      )}

      {isSuppressed && (
        <>
          <EuiSpacer size="s" />
          <EuiBadge data-test-subj={RULE_DETAILS_SUPPRESSED_TEST_ID} title="">
            {DELETED_RULE}
          </EuiBadge>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem data-test-subj={RULE_DETAILS_CREATED_BY_TEST_ID}>
          <EuiText size="xs">
            <CreatedBy createdBy={rule?.created_by} createdAt={rule?.created_at} />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={RULE_DETAILS_UPDATED_BY_TEST_ID}>
          <EuiText size="xs">
            <UpdatedBy updatedBy={rule?.updated_by} updatedAt={rule?.updated_at} />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

Header.displayName = 'Header';
