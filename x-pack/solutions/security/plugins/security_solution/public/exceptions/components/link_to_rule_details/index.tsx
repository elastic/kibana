/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';

import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { RuleDetailTabs } from '../../../detection_engine/rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { SecurityPageName } from '../../../../common/constants';
import { getRuleDetailsTabUrl } from '../../../common/components/link_to/redirect_to_detection_engine';

interface LinkToRuleDetailsProps {
  referenceName: string;
  referenceId: string;
  external?: boolean;
  dataTestSubj?: string;
}
// This component should be removed and moved to @kbn/securitysolution-exception-list-components
// once all the building components get moved

const LinkToRuleDetailsComponent: FC<LinkToRuleDetailsProps> = ({
  referenceName,
  referenceId,
  external,
  dataTestSubj,
}) => {
  return (
    <SecuritySolutionLinkAnchor
      data-test-subj={`linkToRuleSecuritySolutionLink${dataTestSubj ?? ''}`}
      deepLinkId={SecurityPageName.rules}
      path={getRuleDetailsTabUrl(referenceId, RuleDetailTabs.alerts)}
      target={external ? '_blank' : undefined}
    >
      {referenceName}
    </SecuritySolutionLinkAnchor>
  );
};

LinkToRuleDetailsComponent.displayName = 'LinkToRuleDetailsComponent';

export const LinkToRuleDetails = React.memo(LinkToRuleDetailsComponent);

LinkToRuleDetails.displayName = 'LinkToRuleDetails';
