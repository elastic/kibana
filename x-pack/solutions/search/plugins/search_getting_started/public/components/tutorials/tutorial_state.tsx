/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  TutorialStep,
  SnippetVariableKey,
  TutorialSlug,
} from '../../hooks/use_tutorial_content';
import { useTutorialContent } from '../../hooks/use_tutorial_content';
import {
  useExecuteTutorialStep,
  insertValues,
  type EsResponse,
} from '../../hooks/use_execute_tutorial_step';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface StepState {
  status: StepStatus;
  response?: EsResponse;
  error?: string;
}

export interface ResolvedStep {
  /** Original step definition */
  source: TutorialStep;
  /** Step content with all known {{variables}} substituted */
  resolved: {
    header: string;
    description: string;
    explanation: string;
    apiSnippet: string;
  };
  /** Execution state for this step */
  state: StepState;
}

export interface TutorialState {
  selectedTutorial: TutorialSlug;
  currentStep: number;
  savedValues: Record<SnippetVariableKey, string>;
  completed: boolean;
  started: boolean;
}

const resolveStepContent = (
  step: TutorialStep,
  savedValues: Record<SnippetVariableKey, string>
) => ({
  header: insertValues(step.header, savedValues),
  description: insertValues(step.description, savedValues),
  explanation: insertValues(step.explanation, savedValues),
  apiSnippet: insertValues(step.apiSnippet, savedValues),
});

export const useTutorialState = (slug: TutorialSlug) => {
  const execute = useExecuteTutorialStep();
  const { content: rawSteps } = useTutorialContent(slug);

  const [state, setState] = useState<TutorialState>({
    selectedTutorial: slug,
    currentStep: 0,
    savedValues: {},
    completed: false,
    started: false,
  });

  const [stepStates, setStepStates] = useState<StepState[]>(() =>
    rawSteps.map(() => ({ status: 'pending' as StepStatus }))
  );

  const steps: ResolvedStep[] = useMemo(
    () =>
      rawSteps.map((step, i) => ({
        source: step,
        resolved: resolveStepContent(step, state.savedValues),
        state: stepStates[i] ?? { status: 'pending' },
      })),
    [rawSteps, state.savedValues, stepStates]
  );

  const savedValuesRef = useRef(state.savedValues);
  savedValuesRef.current = state.savedValues;

  const executeStep = useCallback(
    async (stepIndex: number) => {
      const step = rawSteps[stepIndex];
      if (!step) return;

      setStepStates((prev) => {
        const next = [...prev];
        next[stepIndex] = { status: 'running' };
        return next;
      });

      try {
        const currentValues = savedValuesRef.current;
        const result = await execute(step, currentValues);

        setStepStates((prev) => {
          const next = [...prev];
          next[stepIndex] = { status: 'completed', response: result.response };
          return next;
        });

        setState((prev) => ({
          ...prev,
          savedValues: { ...prev.savedValues, ...result.extractedValues },
          currentStep: stepIndex + 1,
          started: true,
          completed: stepIndex + 1 >= rawSteps.length,
        }));

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStepStates((prev) => {
          const next = [...prev];
          next[stepIndex] = { status: 'failed', error: message };
          return next;
        });
        throw err;
      }
    },
    [execute, rawSteps]
  );

  const reset = useCallback(() => {
    setState({
      selectedTutorial: slug,
      currentStep: 0,
      savedValues: {},
      completed: false,
      started: false,
    });
    setStepStates(rawSteps.map(() => ({ status: 'pending' })));
  }, [slug, rawSteps]);

  return { state, steps, executeStep, reset };
};
