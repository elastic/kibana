/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { RoundCompleteEventData } from '@kbn/agent-builder-common/chat/events';
import { z } from '@kbn/zod/v4';
import React, { useCallback, useMemo, useRef } from 'react';

import { THREAT_HUNTING_AGENT_ID } from '../../../../../../common/constants';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../common/lib/telemetry';
import { useRoundComplete } from './helpers/use_round_complete';
import { tryGetLatestEsqlQueryFromAttachments } from './helpers/try_get_latest_esql_query_from_attachments';
import * as i18n from './translations';

export interface EditWithAiProps {
  esqlQuery: string;
  onEsqlQueryChange: (query: string) => void;
}

const UPDATE_ESQL_QUERY_TOOL_ID = 'update_esql_query';

const updateEsqlQuerySchema = z.object({
  query: z.string().describe('The new ES|QL query to use for alert retrieval'),
});

const EditWithAiComponent: React.FC<EditWithAiProps> = ({ esqlQuery, onEsqlQueryChange }) => {
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();
  const { agentBuilder, telemetry } = useKibana().services;

  const onEsqlQueryChangeRef = useRef(onEsqlQueryChange);
  onEsqlQueryChangeRef.current = onEsqlQueryChange;

  const lastAppliedEsqlQueryRef = useRef<string | undefined>(undefined);
  const hasExplicitEsqlToolCallInRoundRef = useRef(false);

  const updateEsqlQueryTool: BrowserApiToolDefinition<{ query: string }> = useMemo(
    () => ({
      description: i18n.UPDATE_ESQL_QUERY_TOOL_DESCRIPTION,
      displayName: i18n.UPDATE_ESQL_QUERY_TOOL_DISPLAY_NAME,
      handler: ({ query }: { query: string }) => {
        lastAppliedEsqlQueryRef.current = query;
        hasExplicitEsqlToolCallInRoundRef.current = true;
        onEsqlQueryChangeRef.current(query);
      },
      id: UPDATE_ESQL_QUERY_TOOL_ID,
      schema: updateEsqlQuerySchema,
    }),
    []
  );

  const esqlAttachment: AttachmentInput = useMemo(
    () => ({
      data: { description: i18n.ESQL_ATTACHMENT_DESCRIPTION, query: esqlQuery },
      type: AttachmentType.esql,
    }),
    [esqlQuery]
  );

  const handleRoundComplete = useCallback((data: RoundCompleteEventData) => {
    const hadExplicitToolCall = hasExplicitEsqlToolCallInRoundRef.current;
    hasExplicitEsqlToolCallInRoundRef.current = false;

    if (!hadExplicitToolCall) {
      const query = tryGetLatestEsqlQueryFromAttachments(data.attachments);
      if (query && query !== lastAppliedEsqlQueryRef.current) {
        lastAppliedEsqlQueryRef.current = query;
        onEsqlQueryChangeRef.current(query);
      }
    }
  }, []);

  useRoundComplete({ eventsService: agentBuilder?.events, onRoundComplete: handleRoundComplete });

  const handleClick = useCallback(() => {
    if (agentBuilder?.openChat == null) {
      return;
    }

    telemetry.reportEvent(AttackDiscoveryEventTypes.EditWithAiClicked, {});

    agentBuilder.openChat({
      agentId: THREAT_HUNTING_AGENT_ID,
      attachments: [esqlAttachment],
      autoSendInitialMessage: false,
      browserApiTools: [updateEsqlQueryTool],
      initialMessage: i18n.INITIAL_MESSAGE,
      newConversation: true,
      sessionTag: 'security',
    });
  }, [agentBuilder, esqlAttachment, telemetry, updateEsqlQueryTool]);

  const button = (
    <EuiButtonEmpty
      data-test-subj="editWithAiButton"
      disabled={!isAgentBuilderEnabled}
      iconType="sparkles"
      onClick={handleClick}
      size="s"
    >
      {i18n.EDIT_WITH_AI}
    </EuiButtonEmpty>
  );

  if (!isAgentBuilderEnabled) {
    return (
      <span data-test-subj="editWithAiTooltip">
        <EuiToolTip content={i18n.AGENT_BUILDER_REQUIRED}>{button}</EuiToolTip>
      </span>
    );
  }

  return button;
};

EditWithAiComponent.displayName = 'EditWithAi';

export const EditWithAi = React.memo(EditWithAiComponent);
