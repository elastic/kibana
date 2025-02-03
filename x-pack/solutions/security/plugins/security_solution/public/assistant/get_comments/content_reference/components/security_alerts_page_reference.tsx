/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  securityAlertsPageContentReference: SecurityAlertsPageContentReference;
}

export const SecurityAlertsPageReference: React.FC<Props> = ({
  contentReferenceNode,
  securityAlertsPageContentReference,
}) => {
  const { navigateToApp } = useKibana().services.application;

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigateToApp('security', {
        path: `alerts`,
        openInNewTab: true,
      });
    },
    [navigateToApp]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="SecurityAlertsPageReference"
    >
      <EuiLink onClick={onClick}>{SECURITY_ALERTS_PAGE_REFERENCE_LABEL}</EuiLink>
    </PopoverReference>
  );
};
