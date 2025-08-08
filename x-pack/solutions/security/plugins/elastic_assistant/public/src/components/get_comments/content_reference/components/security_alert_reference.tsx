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
import { SECURITY_ALERT_REFERENCE_LABEL } from './translations';
import type { ResolvedContentReferenceNode } from '../content_reference_parser';
import { PopoverReference } from './popover_reference';
import { useKibana } from '../../../../context/typed_kibana_context/typed_kibana_context';
import { openAlertsPageByAlertId } from './navigation_helpers';
interface Props {
  contentReferenceNode: ResolvedContentReferenceNode<SecurityAlertContentReference>;
}

export const SecurityAlertReference: React.FC<Props> = ({ contentReferenceNode }) => {
  const { navigateToApp } = useKibana().services.application;

  const { assistantAvailability } = useAssistantContext();
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      return openAlertsPageByAlertId(
        navigateToApp,
        contentReferenceNode.contentReference.alertId,
        assistantAvailability.hasSearchAILakeConfigurations
      );
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
