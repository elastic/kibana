/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiComment,
  EuiCommentList,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { API_VERSIONS } from '@kbn/pnd-common';
import * as i18n from './translations';

interface ConversationRound {
  userMessage: string;
  assistantMessage: string;
  timestamp?: string;
}

interface ConversationTabProps {
  investigationId: string;
  isActive: boolean;
}

export const ConversationTab = ({ investigationId, isActive }: ConversationTabProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<ConversationRound[]>([]);

  useEffect(() => {
    if (!isActive || investigationId == null) return;
    let cancelled = false;
    const fetchConversation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/internal/pnd/investigations/${investigationId}/conversation`, {
          headers: { 'Elastic-Api-Version': API_VERSIONS.internal.v1 },
        });
        if (res.status === 404) {
          if (!cancelled) setRounds([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (!cancelled) {
          const mapped: ConversationRound[] = (body.rounds ?? []).map(
            (round: {
              input?: { message?: string };
              response?: { message?: string };
              started_at?: string;
            }) => ({
              userMessage: round.input?.message ?? '',
              assistantMessage: round.response?.message ?? '',
              timestamp: round.started_at,
            })
          );
          setRounds(mapped);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchConversation();
    return () => {
      cancelled = true;
    };
  }, [isActive, investigationId]);

  if (loading) {
    return (
      <EuiText color="subdued" textAlign="center">
        <EuiLoadingSpinner size="l" /> <EuiSpacer size="s" /> {i18n.CONVERSATION_LOADING}
      </EuiText>
    );
  }

  if (error) {
    return (
      <EuiCallOut color="danger" title={i18n.CONVERSATION_ERROR_TITLE} iconType="alert">
        {error}
      </EuiCallOut>
    );
  }

  if (rounds.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="faceHappy"
        title={<h2>{i18n.CONVERSATION_EMPTY_TITLE}</h2>}
        body={<p>{i18n.CONVERSATION_EMPTY_BODY}</p>}
      />
    );
  }

  return (
    <EuiCommentList>
      {rounds.map((round, idx) => (
        <React.Fragment key={idx}>
          <EuiComment username={i18n.CONVERSATION_USER_ANALYST} timestamp={round.timestamp}>
            <EuiText size="s">{round.userMessage}</EuiText>
          </EuiComment>
          <EuiComment
            username={i18n.CONVERSATION_USER_WORKER}
            timestamp={round.timestamp}
            eventColor="primary"
          >
            <EuiText size="s">{round.assistantMessage}</EuiText>
          </EuiComment>
        </React.Fragment>
      ))}
    </EuiCommentList>
  );
};
