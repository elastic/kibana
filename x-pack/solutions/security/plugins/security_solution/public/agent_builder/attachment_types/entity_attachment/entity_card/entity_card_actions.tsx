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
import { APP_UI_ID, ENTITY_ANALYTICS_PATH } from '../../../../../common/constants';
import { getContinueConversationPrompt } from '../prompts';
import type { EntityAttachmentIdentifier } from '../types';

interface EntityCardActionsProps {
  identifier: EntityAttachmentIdentifier;
  setComposerContent?: (text: string) => void;
}

const CONTINUE_CONVERSATION_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.continueConversation',
  { defaultMessage: 'Continue the conversation' }
);

const OPEN_ENTITY_ANALYTICS_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.actions.openEntityAnalytics',
  { defaultMessage: 'Open in Entity Analytics' }
);

export const EntityCardActions: React.FC<EntityCardActionsProps> = ({
  identifier,
  setComposerContent,
}) => {
  const { services } = useKibana<{ application: ApplicationStart }>();

  const handleContinueConversation = useCallback(() => {
    setComposerContent?.(getContinueConversationPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleOpenEntityAnalytics = useCallback(() => {
    services.application?.navigateToApp(APP_UI_ID, { path: ENTITY_ANALYTICS_PATH });
  }, [services.application]);

  return (
    <div data-test-subj="entityAttachmentCardActions">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {setComposerContent && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="discuss"
              onClick={handleContinueConversation}
              data-test-subj="entityAttachmentContinueConversationAction"
              aria-label={CONTINUE_CONVERSATION_LABEL}
            >
              {CONTINUE_CONVERSATION_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
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
