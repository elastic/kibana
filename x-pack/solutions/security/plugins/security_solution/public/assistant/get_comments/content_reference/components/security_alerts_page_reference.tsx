/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertsPageContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { encode } from '@kbn/rison';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { SECURITY_ALERTS_PAGE_REFERENCE_LABEL } from './translations';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../../common/types';
import { URL_PARAM_KEY } from '../../../../common/hooks/constants';
import { getDetectionEngineUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';

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
      if (assistantAvailability.hasSearchAILakeConfigurations) {
        const kqlAppQuery = encode({
          language: 'kuery',
          query: `kibana.alert.workflow_status: ${FILTER_OPEN} OR kibana.alert.workflow_status: ${FILTER_ACKNOWLEDGED}`,
        });

        const urlParams = new URLSearchParams({
          [URL_PARAM_KEY.appQuery]: kqlAppQuery,
        });

        navigateToApp('securitySolutionUI', {
          deepLinkId: SecurityPageName.alertSummary,
          path: getDetectionEngineUrl(urlParams.toString()),
          openInNewTab: true,
        });
      } else {
        openAlertsPageWithFilters(
          {
            selectedOptions: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
            fieldName: 'kibana.alert.workflow_status',
            persist: false,
          },
          true,
          '(global:(timerange:(fromStr:now-24h,kind:relative,toStr:now)))'
        );
      }
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
