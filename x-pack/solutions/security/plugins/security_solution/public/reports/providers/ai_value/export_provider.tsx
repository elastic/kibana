/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { ForwardedAIValueReportState } from '../../../../common/locators/ai_value_report/locator';
import { parseLocationState } from '../../../../common/locators/ai_value_report/locator';

interface AIValueExportContext {
  forwardedState?: ForwardedAIValueReportState;
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

  useEffect(() => {
    if (history.location.state) {
      setForwardedState(parseLocationState(history.location.state));
    }
  }, [history.location.state]);

  useEffect(() => {
    if (reportInput) {
      setReportDataHash(undefined);
      const generateReportDataHash = async () => {
        setReportDataHash(await hashReportData(reportInput));
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
      forwardedState,
      isInsightVerified,
      shouldRegenerateInsight,
      buildForwardedState,
      setInsight,
      setReportInput,
    }),
    [forwardedState, buildForwardedState, isInsightVerified, shouldRegenerateInsight]
  );

  return <AIValueExportContext.Provider value={value}>{children}</AIValueExportContext.Provider>;
}
