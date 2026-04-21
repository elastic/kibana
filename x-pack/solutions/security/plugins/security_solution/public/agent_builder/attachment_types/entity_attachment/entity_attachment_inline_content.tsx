/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryClientProvider } from '@kbn/react-query';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { normaliseEntityAttachment } from './payload';
import type { EntityAttachment } from './types';
import { EntityCard } from './entity_card/entity_card';
import { EntityTable } from './entity_table/entity_table';
import { entityAttachmentQueryClient } from './query_client';

export interface EntityAttachmentInlineContentProps
  extends AttachmentRenderProps<EntityAttachment> {
  experimentalFeatures: ExperimentalFeatures;
}

/**
 * The rich renderer mounts inside Agent Builder's provider tree, which does
 * not carry Security Solution's QueryClientProvider. Wrapping the subtree in
 * a module-scoped client here lets `useEntityFromStore` and siblings run
 * correctly without reaching out of scope for providers.
 */
export const EntityAttachmentInlineContent: React.FC<EntityAttachmentInlineContentProps> = ({
  attachment,
  setComposerContent,
  experimentalFeatures,
}) => {
  const parsed = normaliseEntityAttachment(attachment);

  if (!parsed) {
    return (
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
    );
  }

  const watchlistsEnabled = experimentalFeatures.entityAnalyticsWatchlistEnabled;
  const privmonModifierEnabled = experimentalFeatures.enableRiskScorePrivmonModifier;

  return (
    <QueryClientProvider client={entityAttachmentQueryClient}>
      {parsed.isSingle ? (
        <EntityCard
          identifier={parsed.entities[0]}
          watchlistsEnabled={watchlistsEnabled}
          privmonModifierEnabled={privmonModifierEnabled}
          setComposerContent={setComposerContent}
        />
      ) : (
        <EntityTable entities={parsed.entities} setComposerContent={setComposerContent} />
      )}
    </QueryClientProvider>
  );
};
