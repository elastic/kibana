/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../../common/types';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<SecurityAlertsPageContentReference>;
}

export const SecurityAlertsPageReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openAlertsPageWithFilters(
        {
          selectedOptions: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
          fieldName: 'kibana.alert.workflow_status',
          persist: false,
        },
        true,
        '(global:(timerange:(fromStr:now-24h,kind:relative,toStr:now)))'
      );
    },
    [openAlertsPageWithFilters]
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
