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
import {
  getChangeAssetCriticalityPrompt,
  getCheckGraphPrompt,
  getContinueConversationPrompt,
  getResolutionGroupPrompt,
  getRiskContributionsPrompt,
} from '../prompts';
import type { EntityAttachmentIdentifier } from '../types';

interface EntityCardActionsProps {
  identifier: EntityAttachmentIdentifier;
  setComposerContent?: (text: string) => void;
}

const LABELS = {
  continueConversation: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.continueConversation',
    { defaultMessage: 'Continue the conversation' }
  ),
  riskContributions: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.riskContributions',
    { defaultMessage: 'View risk contributions' }
  ),
  changeAssetCriticality: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.changeAssetCriticality',
    { defaultMessage: 'Change asset criticality' }
  ),
  resolutionGroup: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.resolutionGroup',
    { defaultMessage: 'View resolution group' }
  ),
  checkGraph: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.checkGraph',
    { defaultMessage: 'Check graph' }
  ),
  openEntityAnalytics: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.actions.openEntityAnalytics',
    { defaultMessage: 'Open in Entity Analytics' }
  ),
};

/**
 * Follow-up chip row. All "View X" chips prefill the composer via
 * `setComposerContent`; the user presses Enter to send (prefill-only
 * mechanism — no programmatic send). The Open chip keeps the direct
 * navigation into the Entity Analytics app.
 */
export const EntityCardActions: React.FC<EntityCardActionsProps> = ({
  identifier,
  setComposerContent,
}) => {
  const { services } = useKibana<{ application: ApplicationStart }>();

  const handleContinueConversation = useCallback(() => {
    setComposerContent?.(getContinueConversationPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleRiskContributions = useCallback(() => {
    setComposerContent?.(getRiskContributionsPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleChangeAssetCriticality = useCallback(() => {
    setComposerContent?.(getChangeAssetCriticalityPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleResolutionGroup = useCallback(() => {
    setComposerContent?.(getResolutionGroupPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleCheckGraph = useCallback(() => {
    setComposerContent?.(getCheckGraphPrompt(identifier));
  }, [setComposerContent, identifier]);

  const handleOpenEntityAnalytics = useCallback(() => {
    services.application?.navigateToApp(APP_UI_ID, { path: ENTITY_ANALYTICS_PATH });
  }, [services.application]);

  return (
    <div data-test-subj="entityAttachmentCardActions">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {setComposerContent && (
          <>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="discuss"
                onClick={handleContinueConversation}
                data-test-subj="entityAttachmentContinueConversationAction"
                aria-label={LABELS.continueConversation}
              >
                {LABELS.continueConversation}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="inspect"
                onClick={handleRiskContributions}
                data-test-subj="entityAttachmentRiskContributionsAction"
                aria-label={LABELS.riskContributions}
              >
                {LABELS.riskContributions}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="pencil"
                onClick={handleChangeAssetCriticality}
                data-test-subj="entityAttachmentChangeAssetCriticalityAction"
                aria-label={LABELS.changeAssetCriticality}
              >
                {LABELS.changeAssetCriticality}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="aggregate"
                onClick={handleResolutionGroup}
                data-test-subj="entityAttachmentResolutionGroupAction"
                aria-label={LABELS.resolutionGroup}
              >
                {LABELS.resolutionGroup}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="graphApp"
                onClick={handleCheckGraph}
                data-test-subj="entityAttachmentCheckGraphAction"
                aria-label={LABELS.checkGraph}
              >
                {LABELS.checkGraph}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            onClick={handleOpenEntityAnalytics}
            data-test-subj="entityAttachmentOpenEntityAnalyticsAction"
            aria-label={LABELS.openEntityAnalytics}
          >
            {LABELS.openEntityAnalytics}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
