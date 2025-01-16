/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  securityAlertsPageContentReference: SecurityAlertsPageContentReference;
}

export const SecurityAlertsPageReference: React.FC<Props> = ({
  contentReferenceNode,
  securityAlertsPageContentReference,
}) => {
  return (
    <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount}>
      <EuiLink href={`/app/security/alerts`} target="_blank">
        {SECURITY_ALERTS_PAGE_REFERENCE_LABEL}
      </EuiLink>
    </PopoverReference>
  );
};
