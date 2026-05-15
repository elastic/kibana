/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import type { ToolSchema } from '@kbn/inference-common';
import { isInferenceRequestAbortedError } from '@kbn/inference-common';
import { i18n } from '@kbn/i18n';
import { ENTITY_ANOMALY_DEFAULT_LOOKBACK_DAYS } from '../../../../../common/constants';
import type { EntitySummaryAttribute } from '@kbn/entity-store/common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { getAnonymizedEntityIdentifier } from '../utils/helpers';
import type { EntityHighlightsResponse } from '../types';

const entityHighlightsSchema = {
  type: 'object',
  properties: {
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the highlight section',
          },
          text: {
            type: 'string',
            description: 'The detailed text content for this highlight section.',
          },
        },
        required: ['title', 'text'],
      },
      description:
        'A list of highlight items, each with a title and text. Only include highlights for which information is available in the context.',
    },
    recommendedActions: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'A list of actionable recommendations for the security analyst. Omit this field if no actions are available.',
    },
  },
  required: ['highlights'],
} as const satisfies ToolSchema;

type AssistantResult = {
  response: EntityHighlightsResponse | null;
  replacements: Replacements;
  summaryAsText: string;
  generatedAt: number;
  generatedBy: string;
} | null;

/**
 * Converts a stored entity store summary back into the assistantResult shape
 * so the flyout can display a persisted summary without re-generating.
 */
const buildResultFromStoredSummary = (storedSummary: EntitySummaryAttribute): AssistantResult => ({
  response: {
    // Guard against corrupted stored data — highlights must be an array
    highlights: Array.isArray(storedSummary.highlights) ? storedSummary.highlights : [],
    recommendedActions: Array.isArray(storedSummary.recommendedActions)
      ? storedSummary.recommendedActions
      : null,
  },
  replacements: {},
  summaryAsText: '',
  generatedAt: storedSummary.generated_at ?? 0,
  generatedBy: storedSummary.generated_by ?? '',
});

export const useFetchEntityDetailsHighlights = ({
  connectorId,
  anonymizationFields,
  entityType,
  entityIdentifier,
  storedSummary,
  entitySnapshot,
}: {
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[];
  entityType: string;
  entityIdentifier: string;
  storedSummary?: EntitySummaryAttribute | null;
  /** Current entity signal values — snapshotted into the summary at generation time for staleness detection. */
  entitySnapshot?: {
    riskLevel?: string | null;
    anomalyJobIds?: string[];
    ruleNames?: string[];
  } | null;
}) => {
  const { inference } = useKibana().services;
  const { fetchEntityDetailsHighlights, saveEntityAiSummary } = useEntityAnalyticsRoutes();
  const { addError } = useAppToasts();
  const currentUser = useCurrentUser();
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [assistantResult, setAssistantResult] = useState<AssistantResult>(() =>
    storedSummary ? buildResultFromStoredSummary(storedSummary) : null
  );

  // True once the user has clicked Generate in this mount cycle.
  // Prevents the async entity record arrival from overwriting a freshly generated result.
  const userTriggeredGeneration = useRef(false);

  // The entity record (and therefore storedSummary) may arrive AFTER initial render
  // because the flyout fetches it asynchronously. This effect hydrates the result
  // from the stored summary once it becomes available, but only if the user hasn't
  // already generated a fresh one.
  useEffect(() => {
    if (storedSummary && !userTriggeredGeneration.current) {
      setAssistantResult(buildResultFromStoredSummary(storedSummary));
    }
  }, [storedSummary]);

  const fetchEntityHighlights = useCallback(async () => {
    const errorTitle = i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.highlights.fetch.errorTitle',
      {
        defaultMessage: `Failed to run LLM`,
      }
    );

    // Clear any previously shown error while a new generation attempt is in progress
    setError(null);

    const toDate = Date.now();
    const fromDate = toDate - ENTITY_ANOMALY_DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const { summary, replacements, prompt } = await fetchEntityDetailsHighlights({
      entityType,
      entityIdentifier,
      anonymizationFields,
      from: fromDate,
      to: toDate,
      connectorId,
    }).catch((e: Error) => {
      const caughtError = e instanceof Error ? e : new Error(String(e));
      addError(caughtError, {
        title: errorTitle,
      });
      setError(caughtError);
      return { summary: null, replacements: null, prompt: null };
    });

    if (!summary || !replacements || !prompt) {
      return;
    }

    const summaryFormatted = JSON.stringify(summary);

    const controller = new AbortController();
    setAbortController(controller);
    setIsChatLoading(true);

    try {
      const outputResponse = await inference.output({
        id: 'entity-highlights',
        connectorId,
        schema: entityHighlightsSchema,
        system: prompt,
        input: `Context:
            EntityType: ${entityType},
            EntityIdentifier: ${getAnonymizedEntityIdentifier(entityIdentifier, replacements)},
          ${summaryFormatted}`,
        abortSignal: controller.signal,
      });
      const typedOutput = outputResponse.output as EntityHighlightsResponse;
      const generatedAt = Date.now();
      const generatedBy = currentUser?.username ?? 'unknown';

      userTriggeredGeneration.current = true;
      setAssistantResult({
        summaryAsText: summaryFormatted,
        response: typedOutput,
        replacements,
        generatedAt,
        generatedBy,
      });

      // Persist to entity store — fire-and-forget, don't block UI on this
      saveEntityAiSummary({
        entityId: entityIdentifier,
        entityType,
        summary: {
          highlights: typedOutput.highlights,
          recommendedActions: typedOutput.recommendedActions,
          generated_at: generatedAt,
          risk_level_at_generation: entitySnapshot?.riskLevel ?? null,
          anomaly_job_ids_at_generation: entitySnapshot?.anomalyJobIds ?? null,
          rule_names_at_generation: entitySnapshot?.ruleNames ?? null,
        },
      }).catch((persistError: Error) => {
        // Persist is best-effort — the in-memory result is still usable this session.
        // Surface a non-blocking toast so the user is aware the summary was not saved.
        addError(persistError, {
          title: i18n.translate(
            'xpack.securitySolution.flyout.entityDetails.highlights.persistError',
            { defaultMessage: 'Could not save AI summary — it will not persist after refresh.' }
          ),
        });
      });
    } catch (e) {
      if (isInferenceRequestAbortedError(e)) {
        return;
      }
      const caughtError = e instanceof Error ? e : new Error(String(e));
      addError(caughtError, {
        title: errorTitle,
      });
      setError(caughtError);
    } finally {
      setIsChatLoading(false);
      setAbortController(null);
    }
  }, [
    fetchEntityDetailsHighlights,
    saveEntityAiSummary,
    entityType,
    entityIdentifier,
    anonymizationFields,
    connectorId,
    inference,
    addError,
    currentUser,
    entitySnapshot,
  ]);

  const abortStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsChatLoading(false);
    }
  }, [abortController]);

  return {
    fetchEntityHighlights,
    isChatLoading,
    abortStream,
    result: assistantResult,
    error,
    // True once the user has generated a fresh summary this mount cycle.
    // Used to suppress the staleness banner after regeneration (entity record
    // is not re-fetched after persist, so the old snapshot would otherwise
    // keep triggering the banner).
    isFreshGeneration: userTriggeredGeneration.current,
  };
};
