/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertContentReference } from '@kbn/elastic-assistant-common';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { SECURITY_ALERT_REFERENCE_LABEL } from './translations';
import type { ContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';

interface Props {
  contentReferenceNode: ContentReferenceNode;
  securityAlertContentReference: SecurityAlertContentReference;
}

export const SecurityAlertReference: React.FC<Props> = ({
  contentReferenceNode,
  securityAlertContentReference,
}) => {
  return (
    <PopoverReference contentReferenceCount={contentReferenceNode.contentReferenceCount} data-test-subj='SecurityAlertReference'>
      <EuiLink
        href={`/app/security/alerts/redirect/${securityAlertContentReference.alertId}`}
        target="_blank"
      >
        {SECURITY_ALERT_REFERENCE_LABEL}
      </EuiLink>
    </PopoverReference>
  );
};
