/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { SecurityPageName } from '../../../../app/types';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { RuleDetailTabs } from '../rule_details/use_rule_details_tabs';
import { useRuleDetailsMetadata } from '../rule_details/use_rule_details_metadata';
import { useRuleAuthorDisplayNames } from '../../../rule_management/logic/use_rule_author_display_names';
import * as i18n from './translations';

interface RuleChangeHistoryAppHeaderProps {
  ruleId: string;
  rule: RuleResponse | null;
}

export const RuleChangeHistoryAppHeader = React.memo<RuleChangeHistoryAppHeaderProps>(
  ({ ruleId, rule }) => {
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const { createdBy, updatedBy } = useRuleAuthorDisplayNames({
      createdBy: rule?.created_by,
      createdByProfileUid: rule?.created_by_profile_uid,
      updatedBy: rule?.updated_by ?? undefined,
      updatedByProfileUid: rule?.updated_by_profile_uid,
    });
    const metadata = useRuleDetailsMetadata({ rule, createdBy, updatedBy });

    return (
      <SecurityAppHeader
        title={rule?.name ?? i18n.PAGE_TITLE}
        back={{
          label: i18n.RULE_DETAILS,
          href: getSecuritySolutionUrl({
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsTabUrl(rule?.id ?? ruleId, RuleDetailTabs.overview),
          }),
        }}
        metadata={metadata}
        spacing="largeBleed"
        // The page itself does not scroll; only the diff panel scrolls.
        sticky={false}
      />
    );
  }
);

RuleChangeHistoryAppHeader.displayName = 'RuleChangeHistoryAppHeader';
