/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { APP_UI_ID } from '../../../../../common/constants';
import type { EntityAttachmentIdentifier } from '../types';
import { navigateToEntityAnalyticsHomePageInApp } from '../../entity_explore_navigation';

interface EntityCardActionsProps {
  identifier: EntityAttachmentIdentifier;
  /**
   * Optional core `ApplicationStart`. When provided, the "Open in Entity Analytics" button
   * routes through `navigateToEntityAnalyticsHomePageInApp`, which clears any active
   * Agent Builder-tagged search session before the cross-app jump. When omitted, falls back
   * to `useKibana()` so existing call sites / tests without an explicit `application` prop
   * keep working (they still reach Entity Analytics via the shared helper).
   */
  application?: ApplicationStart;
  /**
   * Optional search session service. Forwarded to `navigateToEntityAnalyticsHomePageInApp`
   * so the active search session tagged with `appName: 'agent_builder'` is cleared before
   * the legitimate cross-app navigation to `securitySolutionUI`.
   */
  searchSession?: ISessionService;
}

const OPEN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openEntityAnalytics',
  { defaultMessage: 'Open in Entity Analytics' }
);

/**
 * Follow-up action row rendered at the bottom of the entity card. The only
 * affordance is a direct jump into the Entity Analytics app; richer chat
 * follow-ups live on the agent side via `<render_attachment>` and prose.
 */
export const EntityCardActions: React.FC<EntityCardActionsProps> = ({
  identifier: _identifier,
  application,
  searchSession,
}) => {
  const { services } = useKibana<{ application: ApplicationStart }>();
  const effectiveApplication = application ?? services.application;

  const handleOpenEntityAnalytics = useCallback(() => {
    if (!effectiveApplication) {
      return;
    }
    navigateToEntityAnalyticsHomePageInApp({
      application: effectiveApplication,
      appId: APP_UI_ID,
      searchSession,
    });
  }, [effectiveApplication, searchSession]);

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
            aria-label={OPEN_ENTITY_ANALYTICS_LABEL}
          >
            {OPEN_ENTITY_ANALYTICS_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
