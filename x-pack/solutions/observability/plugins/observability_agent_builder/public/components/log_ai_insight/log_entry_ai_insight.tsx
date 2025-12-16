/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AiInsight } from '@kbn/ai-insights';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useKibana } from '../../hooks/use_kibana';
import { explainLogMessageButtonLabel, explainLogMessageDescription } from './translations';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { useLicense } from '../../hooks/use_license';

export interface LogAiInsightDocument {
  fields: {
    field: string;
    value: unknown[];
  }[];
}

export interface LogAiInsightProps {
  doc: LogAiInsightDocument | undefined;
}

export function LogEntryAiInsight({ doc }: LogAiInsightProps) {
  const {
    services: { http, onechat },
  } = useKibana();

  const { getLicense } = useLicense();
  const license = getLicense();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [context, setSummaryContext] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const { index, id } = useMemo(() => {
    return {
      index: doc?.fields.find((field) => field.field === '_index')?.value[0],
      id: doc?.fields.find((field) => field.field === '_id')?.value[0],
    };
  }, [doc]);

  const fetchAiInsights = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await http?.post<{ summary: string; context: string }>(
        '/internal/observability_agent_builder/ai_insights/log',
        {
          body: JSON.stringify({
            index,
            id,
          }),
        }
      );
      setSummary(response?.summary ?? '');
      setSummaryContext(response?.context ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
    } finally {
      setIsLoading(false);
    }
  };

  const attachments = useMemo(() => {
    return [
      {
        type: 'screen_context',
        data: {
          app: 'discover',
          url: window.location.href,
        },
        hidden: true,
      },
      {
        type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
        data: {
          summary,
          context,
        },
      },
      {
        type: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
        data: {
          index,
          id,
        },
      },
    ];
  }, [summary, context, index, id]);

  if (!onechat || !isAgentChatExperienceEnabled) {
    return null;
  }
  return (
    <>
      <AiInsight
        title={explainLogMessageButtonLabel}
        description={explainLogMessageDescription}
        content={summary}
        isLoading={isLoading}
        onOpen={fetchAiInsights}
        error={error}
        license={license}
        onStartConversation={() => {
          onechat?.openConversationFlyout({
            attachments,
            newConversation: true,
          });
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default LogEntryAiInsight;
