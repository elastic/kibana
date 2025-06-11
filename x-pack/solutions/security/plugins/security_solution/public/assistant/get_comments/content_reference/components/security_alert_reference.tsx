/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAlertContentReference } from '@kbn/elastic-assistant-common';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { encode } from '@kbn/rison';
import { URL_PARAM_KEY } from '../../../../common/hooks/constants';
import { getDetectionEngineUrl } from '../../../../common/components/link_to';
import { SECURITY_ALERT_REFERENCE_LABEL } from './translations';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<SecurityAlertContentReference>;
}

export const SecurityAlertReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const { navigateToApp } = useKibana().services.application;

  const { assistantAvailability } = useAssistantContext();
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (assistantAvailability.hasSearchAILakeConfigurations) {
        const kqlAppQuery = encode({
          language: 'kuery',
          query: `_id: ${contentReferenceNode.contentReference.alertId}`,
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
        navigateToApp('security', {
          path: `alerts/redirect/${contentReferenceNode.contentReference.alertId}`,
          openInNewTab: true,
        });
      }
    },
    [
      assistantAvailability.hasSearchAILakeConfigurations,
      contentReferenceNode.contentReference.alertId,
      navigateToApp,
    ]
  );

  return (
    <PopoverReference
      contentReferenceCount={contentReferenceNode.contentReferenceCount}
      data-test-subj="SecurityAlertReference"
    >
      <EuiLink onClick={onClick} data-test-subj="alertReferenceLink">
        {SECURITY_ALERT_REFERENCE_LABEL}
      </EuiLink>
    </PopoverReference>
  );
};
