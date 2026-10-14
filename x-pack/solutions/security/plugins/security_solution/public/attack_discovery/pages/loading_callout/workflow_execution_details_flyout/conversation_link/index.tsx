/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import React, { useMemo } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from '../translations';

interface Props {
  conversationId: string;
}

const ConversationLinkComponent: React.FC<Props> = ({ conversationId }) => {
  const { application } = useKibana().services;

  // The legacy `/conversations/:conversationId` route redirects to the
  // agent-scoped conversation, resolving the owning agent from the
  // conversation itself (we only persist the conversation id, not the agent
  // id). `getUrlForApp` throws when the Agent Builder app is not registered
  // (e.g. the plugin is disabled), in which case the link is omitted.
  const href = useMemo(() => {
    try {
      return application.getUrlForApp(AGENTBUILDER_APP_ID, {
        path: `/conversations/${encodeURIComponent(conversationId)}`,
      });
    } catch {
      return null;
    }
  }, [application, conversationId]);

  if (href == null) {
    return null;
  }

  return (
    <EuiLink data-test-subj="openConversationLink" href={href} target="_blank">
      {i18n.OPEN_CONVERSATION}
    </EuiLink>
  );
};

ConversationLinkComponent.displayName = 'ConversationLink';

export const ConversationLink = React.memo(ConversationLinkComponent);
