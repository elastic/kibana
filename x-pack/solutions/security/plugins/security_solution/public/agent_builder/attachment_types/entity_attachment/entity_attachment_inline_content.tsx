/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Global, css } from '@emotion/react';
import { EuiCallOut, EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryClientProvider } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { normaliseEntityAttachment } from './payload';
import type { EntityAttachment } from './types';
import { EntityCard } from './entity_card/entity_card';
import { EntityTable } from './entity_table/entity_table';
import { entityAttachmentQueryClient } from './query_client';

export interface EntityAttachmentInlineContentProps
  extends AttachmentRenderProps<EntityAttachment> {
  experimentalFeatures: ExperimentalFeatures;
  /**
   * Optional navigation context. When provided, `EntityTable` adds per-row Explore icons that
   * deep-link into the Security Solution Hosts/Users/Services pages (mirrors the dashboard's
   * `EntityListTable`). Without them the table renders without per-row navigation.
   */
  application?: ApplicationStart;
  searchSession?: ISessionService;
}

/**
 * Stable marker class on the inline-content root. Used by the global style
 * below (via `:has()`) to target the ancestor `EuiSplitPanel.Outer` that the
 * agent_builder renderer mounts around us.
 */
export const ENTITY_ATTACHMENT_ROOT_CLASS = 'securitySolutionEntityAttachment__root';

/**
 * The rich renderer mounts inside Agent Builder's provider tree, which does
 * not carry Security Solution's QueryClientProvider. Wrapping the subtree in
 * a module-scoped client here lets `useEntityFromStore` and siblings run
 * correctly without reaching out of scope for providers.
 */
export const EntityAttachmentInlineContent: React.FC<EntityAttachmentInlineContentProps> = ({
  attachment,
  experimentalFeatures,
  application,
  searchSession,
}) => {
  const parsed = normaliseEntityAttachment(attachment);
  const { euiTheme } = useEuiTheme();

  // Workaround for a missing trailing spacer in agent_builder's
  // createRenderAttachmentRenderer
  // (x-pack/platform/plugins/shared/agent_builder/public/application/components/
  // conversations/conversation_rounds/round_response/markdown_plugins/
  // render_attachment_plugin.tsx): other markdown block renderers (codeBlock,
  // table) append an <EuiSpacer />, but render_attachment does not, so the
  // attachment's EuiSplitPanel.Outer ends flush against the following
  // paragraph. We cannot add a spacer from inside the renderer because we
  // render in EuiSplitPanel.Inner; the visible panel is the outer split-panel.
  // Scope the rule tightly via `:has()` so it only targets panels that wrap
  // our attachment. Remove once the upstream renderer adds a trailing spacer.
  const outerPanelMarginStyles = useMemo(
    () => css`
      .euiSplitPanel:has(> .euiSplitPanel__inner > .${ENTITY_ATTACHMENT_ROOT_CLASS}) {
        margin-block-end: ${euiTheme.size.m};
      }
    `,
    [euiTheme.size.m]
  );

  if (!parsed) {
    return (
      <>
        <Global styles={outerPanelMarginStyles} />
        <div className={ENTITY_ATTACHMENT_ROOT_CLASS}>
          <EuiPanel
            hasShadow={false}
            hasBorder={false}
            paddingSize="m"
            data-test-subj="entityAttachmentEmpty"
          >
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType="warning"
              title={i18n.translate(
                'xpack.securitySolution.agentBuilder.entityAttachment.empty.title',
                { defaultMessage: 'No entity information available' }
              )}
            >
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.entityAttachment.empty.description',
                {
                  defaultMessage:
                    'The entity attachment does not contain a valid identifier. The agent may still respond to the original question.',
                }
              )}
            </EuiCallOut>
          </EuiPanel>
        </div>
      </>
    );
  }

  const watchlistsEnabled = experimentalFeatures.entityAnalyticsWatchlistEnabled;
  const privmonModifierEnabled = experimentalFeatures.enableRiskScorePrivmonModifier;

  return (
    <>
      <Global styles={outerPanelMarginStyles} />
      <div className={ENTITY_ATTACHMENT_ROOT_CLASS}>
        <QueryClientProvider client={entityAttachmentQueryClient}>
          {parsed.isSingle ? (
            <EntityCard
              identifier={parsed.entities[0]}
              riskStats={parsed.riskStats}
              resolutionRiskStats={parsed.resolutionRiskStats}
              watchlistsEnabled={watchlistsEnabled}
              privmonModifierEnabled={privmonModifierEnabled}
              application={application}
              searchSession={searchSession}
            />
          ) : (
            <EntityTable
              entities={parsed.entities}
              application={application}
              searchSession={searchSession}
            />
          )}
        </QueryClientProvider>
      </div>
    </>
  );
};
