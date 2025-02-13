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

interface LinkToListDetailsProps {
  linkTitle: string;
  listId: string;
  external?: boolean;
  dataTestSubj?: string;
}
// This component should be removed and moved to @kbn/securitysolution-exception-list-components
// once all the building components get moved

const LinkToListDetailsComponent: FC<LinkToListDetailsProps> = ({
  linkTitle,
  listId,
  external,
  dataTestSubj,
}) => {
  return (
    <SecuritySolutionLinkAnchor
      data-test-subj={`linkToRuleSecuritySolutionLink${dataTestSubj ?? ''}`}
      deepLinkId={SecurityPageName.exceptions}
      path={`/details/${listId}`}
      target={external ? '_blank' : undefined}
    >
      {linkTitle}
    </SecuritySolutionLinkAnchor>
  );
};

LinkToListDetailsComponent.displayName = 'LinkToListDetailsComponent';

export const LinkToListDetails = React.memo(LinkToListDetailsComponent);

LinkToListDetails.displayName = 'LinkToListDetails';
