/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHistory } from 'react-router-dom';
import type { ForwardedAIValueReportState } from '../../../../common/locators/ai_value_report/locator';
import { parseLocationState } from '../../../../common/locators/ai_value_report/locator';
import { useKibana } from '../../../common/lib/kibana';
import { AIValueReportEventTypes } from '../../../common/lib/telemetry/events/ai_value_report/types';

interface AIValueExportContext {
  forwardedState?: ForwardedAIValueReportState;
  isExportMode: boolean;
  isInsightVerified: boolean;
  shouldRegenerateInsight?: boolean;
  setReportInput: (inputData: object) => void;
  setInsight: (insight: string) => void;
  buildForwardedState: (
    params: Pick<ForwardedAIValueReportState, 'timeRange'>
  ) => ForwardedAIValueReportState | undefined;
}

const AIValueExportContext = createContext<AIValueExportContext | null>(null);

export const useAIValueExportContext = () => useContext(AIValueExportContext);

interface AIValueExportProviderProps {
  children: React.ReactNode;
}

const hashReportData = async (data: object) => {
  const str = JSON.stringify(data);
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * This provider manages context for the AI Value Report.
 * It exposes hooks for setting the report’s input data and the AI-generated
 * cost-savings trend insight when the report is loaded.
 *
 * After these values are set, the `buildForwardedState` function becomes ready
 * to use when exporting the report to PDF. Only the AI-generated insight and a
 * hash of the input data it was derived from are included in the forwarded
 * state. This ensures the backend does not regenerate the insight (and consume
 * AI tokens) if the input data has not changed.
 *
 * If the navigation history contains a state (indicating that the page is being
 * exported, such as to PDF), the provider parses that state and extracts the
 * AI-generated insight along with the input-data hash. It then waits for the
 * report data to load, hashes it, and checks it against the forwarded hash.
 * If the hashes match, `shouldRegenerateInsight` is set to false; otherwise it
 * is set to true.
 */
export function AIValueExportProvider({ children }: AIValueExportProviderProps) {
  const history = useHistory();

  const [forwardedState, setForwardedState] = useState<ForwardedAIValueReportState | undefined>();
  const [isInsightVerified, setIsInsightVerified] = useState<boolean>(false);
  const [shouldRegenerateInsight, setShouldRegenerateInsight] = useState<boolean | undefined>();

  const [reportInput, setReportInput] = useState<object | undefined>();
  const [reportDataHash, setReportDataHash] = useState<string | undefined>();

  const [insight, setInsight] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [hashReportErrorMessage, setHashReportErrorMessage] = useState<string>('');
  const { telemetry } = useKibana().services;
  const [isExportMode, setIsExportMode] = useState<boolean>(false);

  useEffect(() => {
    if (history.location.state) {
      const parsedState = parseLocationState(history.location.state);

      // Only treat this as "export mode" when the forwarded state includes the data we need to
      // verify / reuse the pre-generated insight. Other navigations (e.g. "Open ..." from
      // Reporting) may include unrelated history state or only a timeRange, and should render the
      // normal UI (including the date picker).
      if (parsedState?.insight && parsedState?.reportDataHash) {
        setForwardedState(parsedState);
        setIsExportMode(true);
        return;
      }
    }
    setForwardedState(undefined);
    setIsExportMode(false);
  }, [history.location.state]);

  useEffect(() => {
    if (reportInput) {
      setReportDataHash(undefined);
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const generateReportDataHash = async () => {
        let hash: string;
        try {
          hash = await hashReportData(reportInput);
        } catch (e) {
          // Fallback to the date string which will force the regeneration of the insight
          hash = new Date().toISOString();
          setHashReportErrorMessage(e?.message ?? 'error during the hash generation');
        }

        if (controller.signal.aborted) {
          return;
        }
        setReportDataHash(hash);
      };

      generateReportDataHash();
    }
  }, [reportInput]);

  useEffect(() => {
    if (forwardedState && reportDataHash) {
      setShouldRegenerateInsight(reportDataHash !== forwardedState.reportDataHash);
      setIsInsightVerified(true);
    }
  }, [forwardedState, reportDataHash]);

  // Telemetry reporting
  useEffect(() => {
    if (isInsightVerified && shouldRegenerateInsight !== undefined) {
      telemetry.reportEvent(AIValueReportEventTypes.AIValueReportExportInsightVerified, {
        shouldRegenerate: shouldRegenerateInsight,
      });
    }
  }, [telemetry, isInsightVerified, shouldRegenerateInsight]);

  useEffect(() => {
    if (isExportMode) {
      telemetry.reportEvent(AIValueReportEventTypes.AIValueReportExportExecution, {});
    }
  }, [isExportMode, telemetry]);

  useEffect(() => {
    if (hashReportErrorMessage) {
      telemetry.reportEvent(AIValueReportEventTypes.AIValueReportExportError, {
        errorMessage: hashReportErrorMessage,
        isExportMode,
      });
    }
  }, [hashReportErrorMessage, isExportMode, telemetry]);

  const buildForwardedState = useCallback(
    ({
      timeRange,
    }: Pick<ForwardedAIValueReportState, 'timeRange'>): ForwardedAIValueReportState | undefined => {
      if (!insight || !reportDataHash) {
        return undefined;
      }

      return {
        timeRange,
        insight,
        reportDataHash,
      };
    },
    [insight, reportDataHash]
  );

  const value = useMemo(
    () => ({
      isExportMode,
      forwardedState,
      isInsightVerified,
      shouldRegenerateInsight,
      buildForwardedState,
      setInsight,
      setReportInput,
    }),
    [forwardedState, buildForwardedState, isInsightVerified, shouldRegenerateInsight, isExportMode]
  );

  return <AIValueExportContext.Provider value={value}>{children}</AIValueExportContext.Provider>;
}
