/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { SIGNIFICANT_EVENTS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  DECISION_TREE_ATTACHMENT_TYPE,
  type DecisionTreeAttachmentData,
} from '../../common/decision_trees';
import { decisionTreeLabel } from './decision_tree_label';

type DecisionTreeAttachment = Attachment<
  typeof DECISION_TREE_ATTACHMENT_TYPE,
  DecisionTreeAttachmentData
>;

const LazyDecisionTreeSummary = React.lazy(() =>
  import('./decision_tree_summary').then(({ DecisionTreeSummary }) => ({
    default: DecisionTreeSummary,
  }))
);

const LazyDecisionTreeInline = React.lazy(() =>
  import('./decision_tree_summary').then(({ DecisionTreeInline }) => ({
    default: DecisionTreeInline,
  }))
);

/**
 * Registers the `nightshift.decision_tree` attachment UI: a link to the tree in the Nightshift
 * management app, as a row of the investigation flyout's attachment summary and inline in chat.
 */
export const registerDecisionTreeAttachmentType = ({
  agentBuilder,
  application,
  share,
}: {
  agentBuilder: AgentBuilderPluginStart;
  application: ApplicationStart;
  share: SharePluginStart;
}): void => {
  const getHref = (symptom: string): string | undefined =>
    share.url.locators.get(SIGNIFICANT_EVENTS_APP_LOCATOR_ID)?.getRedirectUrl({
      tab: 'decision_trees',
      selectedItem: symptom,
    });
  const open = (symptom: string) => {
    const href = getHref(symptom);
    if (href) {
      application.navigateToUrl(href);
    }
  };

  agentBuilder.attachments.addAttachmentType<DecisionTreeAttachment>(
    DECISION_TREE_ATTACHMENT_TYPE,
    {
      getLabel: ({ data }) => decisionTreeLabel(data),
      getIcon: () => 'branch',
      onClick: ({ attachment }) => open(attachment.data.symptom),
      renderInlineContent: ({ attachment }) => (
        <Suspense fallback={null}>
          <LazyDecisionTreeInline data={attachment.data} href={getHref(attachment.data.symptom)} />
        </Suspense>
      ),
      renderConversationDetailsContent: ({ attachment }) => (
        <Suspense fallback={null}>
          <LazyDecisionTreeSummary
            data={attachment.data}
            onOpen={() => open(attachment.data.symptom)}
          />
        </Suspense>
      ),
    }
  );
};
