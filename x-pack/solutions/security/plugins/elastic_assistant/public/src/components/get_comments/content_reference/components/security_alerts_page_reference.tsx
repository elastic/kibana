/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';
import { useNavigateToAlertsPageWithFilters } from '../../../../hooks/navigate_to_alerts_page_with_filters/use_navigate_to_alerts_page_with_filters';
import { openAlertsPageByOpenAndAck } from './navigation_helpers';
import { useKibana } from '../../../../context/typed_kibana_context/typed_kibana_context';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<SecurityAlertsPageContentReference>;
}

export const SecurityAlertsPageReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();
  const { assistantAvailability } = useAssistantContext();
  const { navigateToApp } = useKibana().services.application;

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      return openAlertsPageByOpenAndAck(
        navigateToApp,
        openAlertsPageWithFilters,
        assistantAvailability.hasSearchAILakeConfigurations
      );
    },
    [assistantAvailability.hasSearchAILakeConfigurations, navigateToApp, openAlertsPageWithFilters]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="SecurityAlertsPageReference"
    >
      <EuiLink onClick={onClick} data-test-subj="alertsReferenceLink">
        {SECURITY_ALERTS_PAGE_REFERENCE_LABEL}
      </EuiLink>
    </PopoverReference>
  );
};
