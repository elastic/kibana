/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryPage } from './types';

const AGENT_BUILDER_APP_PATH = '/app/agent_builder';

/**
 * The Agent Builder route for one conversation, relative to Kibana's root.
 *
 * The canonical route is agent-scoped (`/agents/:agentId/conversations/:id`), so it
 * needs both ids. A memory written before `agent_id` was persisted only has the
 * conversation, which still resolves through the legacy unscoped route — which is
 * what `event_investigations.tsx` in this app already links to.
 *
 * Both ids are percent-encoded: they are opaque ids, and one containing a slash
 * would otherwise address a different route.
 */
export const getSourceTaskPath = (conversationId: string, agentId: string | undefined): string => {
  const conversation = encodeURIComponent(conversationId);
  if (agentId === undefined || agentId.length === 0) {
    return `${AGENT_BUILDER_APP_PATH}/conversations/${conversation}`;
  }
  return `${AGENT_BUILDER_APP_PATH}/agents/${encodeURIComponent(
    agentId
  )}/conversations/${conversation}`;
};

interface MemorySourceTaskLinkProps {
  page: MemoryPage;
}

/**
 * A link to the investigation that produced this memory.
 *
 * Provenance is the one thing the page cannot show from the document itself, and a
 * memory with no `conversation_id` predates the field, so the link is omitted
 * rather than rendered dead.
 */
export function MemorySourceTaskLink({ page }: MemorySourceTaskLinkProps) {
  const {
    core: { http },
  } = useKibana();

  const { conversation_id: conversationId, agent_id: agentId } = page;
  if (conversationId === undefined || conversationId.length === 0) {
    return null;
  }

  return (
    <EuiText size="xs" color="subdued">
      <EuiLink
        href={http.basePath.prepend(getSourceTaskPath(conversationId, agentId))}
        data-test-subj="nightshiftMemorySourceTaskLink"
      >
        {i18n.translate('xpack.significantEventsApp.memory.sourceTaskLink', {
          defaultMessage: 'Source task',
        })}
      </EuiLink>
    </EuiText>
  );
}
