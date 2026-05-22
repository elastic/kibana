/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityAttachmentIdentifier } from '../types';
import { buildEntityRightPanel } from '../../entity_explore_navigation';
import { useEntityAnalyticsAgentNavigation } from '../../entity_analytics_agent_navigation_context';

interface EntityCardActionsProps {
  identifier: EntityAttachmentIdentifier;
}

const OPEN_IN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openInEntityAnalytics',
  { defaultMessage: 'Open in Entity Analytics' }
);

const OPEN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openEntityAnalytics',
  { defaultMessage: 'Open Entity Analytics' }
);

/**
 * Follow-up action row rendered at the bottom of the entity card. The only
 * affordance is a jump into the Entity Analytics app: for host/user/service
 * entities backed by the entity store we deep-link straight into the
 * expandable flyout (same `?flyout=…` payload shape the EA page emits
 * itself), otherwise we fall back to the unfiltered EA home page and adjust
 * the label from "Open in Entity Analytics" to "Open Entity Analytics" so
 * the copy matches the navigation target.
 */
export const EntityCardActions: React.FC<EntityCardActionsProps> = ({ identifier }) => {
  const { canNavigate, navigateWithFlyout, navigateToHome } = useEntityAnalyticsAgentNavigation();

  const rightPanel = useMemo(() => buildEntityRightPanel(identifier), [identifier]);
  const label = rightPanel ? OPEN_IN_ENTITY_ANALYTICS_LABEL : OPEN_ENTITY_ANALYTICS_LABEL;

  const handleOpenEntityAnalytics = useCallback(() => {
    if (!canNavigate) {
      return null;
    }

    if (rightPanel) {
      navigateWithFlyout({ preview: [], right: rightPanel });
    } else {
      navigateToHome();
    }
  }, [canNavigate, navigateWithFlyout, navigateToHome, rightPanel]);

  return (
    <div data-test-subj="entityAttachmentCardActions">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            onClick={handleOpenEntityAnalytics}
            data-test-subj="entityAttachmentOpenEntityAnalyticsAction"
            aria-label={label}
          >
            {label}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
