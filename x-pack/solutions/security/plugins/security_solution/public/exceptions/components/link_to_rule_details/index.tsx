/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';

import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { SecurityPageName } from '../../../../common/constants';
import { getRuleDetailsUrl } from '../../../common/components/link_to';

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
  const ruleDetailsUrl = getRuleDetailsUrl(referenceId);
  return (
    <SecuritySolutionLinkAnchor
      data-test-subj={`linkToRuleSecuritySolutionLink${dataTestSubj ?? ''}`}
      deepLinkId={SecurityPageName.rules}
      path={ruleDetailsUrl}
      target={external ? '_blank' : undefined}
    >
      {referenceName}
    </SecuritySolutionLinkAnchor>
  );
};

LinkToRuleDetailsComponent.displayName = 'LinkToRuleDetailsComponent';

export const LinkToRuleDetails = React.memo(LinkToRuleDetailsComponent);

LinkToRuleDetails.displayName = 'LinkToRuleDetails';
