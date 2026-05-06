/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useKibana } from '../../../../../common/lib/kibana';
import { RuleCreationEventTypes } from '../../../../../common/lib/telemetry/types';
import type { RuleCreationSource } from '../../../../../common/lib/telemetry/types';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { extractThreatTechniqueIds } from '../../../../common/telemetry_helpers';

interface SessionInfo {
  creationSource: RuleCreationSource;
  sessionId: string;
  sessionStart: number;
}

interface UseRuleCreationTelemetryReturn {
  isAiRuleAppliedRef: React.MutableRefObject<boolean>;
  ruleSavedRef: React.MutableRefObject<boolean>;
  getAiMeta: () => { creationSource: 'ai'; aiSessionId: string } | undefined;
  reportRuleCreated: (params: { rule: RuleResponse }) => void;
  reportRuleCreationError: (params: { ruleType: string; error: Error }) => void;
}

/**
 * Encapsulates EBT telemetry for the rule creation page.
 *
 * Handles:
 * - Reporting `CreationInitialized` on mount (manual sessions)
 * - Reporting `CreationAbandoned` on unmount (when rule was not saved)
 * - `reportRuleCreated` / `reportRuleCreationError` helpers for the save flow
 * - Resolving AI vs manual session context automatically
 *
 * @param ruleType - reactive rule type value used for the abandoned event
 */
export const useRuleCreationTelemetry = (ruleType: string): UseRuleCreationTelemetryReturn => {
  const { telemetry, aiRuleCreation } = useKibana().services;
  const isAiRuleAppliedRef = useRef(false);
  const ruleSavedRef = useRef(false);
  const manualSessionRef = useRef<{ sessionId: string; startTimestamp: number } | null>(null);

  const ruleTypeRef = useRef(ruleType);
  ruleTypeRef.current = ruleType;

  useEffect(() => {
    const aiSession = aiRuleCreation.getSession();
    if (!aiSession) {
      const manualSession = { sessionId: uuidv4(), startTimestamp: Date.now() };
      manualSessionRef.current = manualSession;
      telemetry.reportEvent(RuleCreationEventTypes.CreationInitialized, {
        creationSource: 'manual',
        sessionId: manualSession.sessionId,
      });
    }

    return () => {
      if (ruleSavedRef.current) {
        return;
      }

      const aiSessionOnUnmount = aiRuleCreation.getSession();
      const isAi = aiSessionOnUnmount != null && aiSessionOnUnmount.applyCount > 0;
      const sessionId = isAi
        ? aiSessionOnUnmount.sessionId
        : manualSessionRef.current?.sessionId ?? '';
      const sessionStart = isAi
        ? aiSessionOnUnmount.startTimestamp
        : manualSessionRef.current?.startTimestamp ?? Date.now();

      telemetry.reportEvent(RuleCreationEventTypes.CreationAbandoned, {
        creationSource: isAi ? 'ai' : 'manual',
        sessionId,
        ruleType: ruleTypeRef.current ?? 'unknown',
        numberOfAiEdits: isAi ? aiSessionOnUnmount.applyCount : 0,
        durationSinceSessionStartMs: Date.now() - sessionStart,
      });

      if (isAi) {
        aiRuleCreation.clearSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSessionInfo = useCallback((): SessionInfo => {
    const aiSession = aiRuleCreation.getSession();
    const isAiCreated = isAiRuleAppliedRef.current && aiSession != null;
    return {
      creationSource: isAiCreated ? 'ai' : 'manual',
      sessionId: isAiCreated ? aiSession.sessionId : manualSessionRef.current?.sessionId ?? '',
      sessionStart: isAiCreated
        ? aiSession.startTimestamp
        : manualSessionRef.current?.startTimestamp ?? Date.now(),
    };
  }, [aiRuleCreation]);

  const getAiMeta = useCallback((): { creationSource: 'ai'; aiSessionId: string } | undefined => {
    const aiSession = aiRuleCreation.getSession();
    const isAiCreated = isAiRuleAppliedRef.current && aiSession != null;
    if (isAiCreated) {
      return { creationSource: 'ai', aiSessionId: aiSession.sessionId };
    }
    return undefined;
  }, [aiRuleCreation]);

  const reportRuleCreated = useCallback(
    ({ rule }: { rule: RuleResponse }) => {
      const aiSession = aiRuleCreation.getSession();
      const isAiCreated = isAiRuleAppliedRef.current && aiSession != null;
      const { creationSource, sessionId, sessionStart } = getSessionInfo();

      ruleSavedRef.current = true;

      telemetry.reportEvent(RuleCreationEventTypes.RuleCreated, {
        creationSource,
        sessionId,
        ruleType: rule.type,
        enabled: rule.enabled,
        numberOfAiEdits: isAiCreated ? aiSession.applyCount : 0,
        threatTechniques: extractThreatTechniqueIds(rule.threat),
        durationSinceSessionStartMs: Date.now() - sessionStart,
      });

      if (isAiCreated) {
        aiRuleCreation.clearSession();
      }
    },
    [aiRuleCreation, getSessionInfo, telemetry]
  );

  const reportRuleCreationError = useCallback(
    ({ ruleType: type, error }: { ruleType: string; error: Error }) => {
      const aiSession = aiRuleCreation.getSession();
      const isAiCreated = isAiRuleAppliedRef.current && aiSession != null;
      const { creationSource, sessionId, sessionStart } = getSessionInfo();

      telemetry.reportEvent(RuleCreationEventTypes.RuleCreationError, {
        creationSource,
        sessionId,
        ruleType: type,
        errorMessage: error?.message ?? 'Unknown error',
        numberOfAiEdits: isAiCreated ? aiSession.applyCount : 0,
        durationSinceSessionStartMs: Date.now() - sessionStart,
      });

      if (isAiCreated) {
        aiRuleCreation.clearSession();
      }
    },
    [aiRuleCreation, getSessionInfo, telemetry]
  );

  return {
    isAiRuleAppliedRef,
    ruleSavedRef,
    getAiMeta,
    reportRuleCreated,
    reportRuleCreationError,
  };
};
