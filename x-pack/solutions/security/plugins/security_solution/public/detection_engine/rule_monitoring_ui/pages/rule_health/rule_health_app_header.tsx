/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageName } from '../../../../app/types';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TECHNICAL_PREVIEW } from '../../../../common/components/technical_preview_badge/translations';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import * as i18n from './translations';

interface RuleHealthAppHeaderProps {
  ruleId: string;
}

export const RuleHealthAppHeader = React.memo<RuleHealthAppHeaderProps>(({ ruleId }) => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  return (
    <SecurityAppHeader
      title={i18n.RULE_HEALTH_TITLE(ruleId)}
      back={{
        label: i18n.RULE_DETAILS,
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(ruleId, RuleDetailTabs.overview),
        }),
      }}
      badges={[{ label: TECHNICAL_PREVIEW, color: 'accent' }]}
      spacing="largeBleed"
    />
  );
});

RuleHealthAppHeader.displayName = 'RuleHealthAppHeader';
