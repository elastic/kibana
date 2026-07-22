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
import type {
  PersistedEntityAiSummary,
  EntitySummaryStalenessEntitySnapshot,
} from '@kbn/entity-store/common';
import {
  buildEntitySummaryStaleness,
  capEntitySummaryContent,
} from '@kbn/entity-store/common/entity_summary';
import { ENTITY_ANOMALY_DEFAULT_LOOKBACK_DAYS } from '../../../../../common/constants';
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
    recommended_actions: {
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
 * Converts a persisted summary (from the metadata datastream) back into the
 * assistantResult shape so the flyout can display it without re-generating.
 */
const buildResultFromStoredSummary = (
  storedSummary: PersistedEntityAiSummary
): AssistantResult => ({
  response: {
    // Guard against corrupted stored data — highlights must be an array
    highlights: Array.isArray(storedSummary.highlights) ? storedSummary.highlights : [],
    recommended_actions: Array.isArray(storedSummary.recommended_actions)
      ? storedSummary.recommended_actions
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
  refetchEntityRecord,
  refetchPersistedSummary,
}: {
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[];
  entityType: string;
  entityIdentifier: string;
  storedSummary?: PersistedEntityAiSummary | null;
  /** Current entity signal values — snapshotted into the summary at generation time for staleness detection. */
  entitySnapshot?: EntitySummaryStalenessEntitySnapshot | null;
  /** Refetch entity store record after persist so the staleness snapshot stays in sync. */
  refetchEntityRecord?: () => void;
  /** Refetch the persisted summary from the metadata datastream after a new one is saved. */
  refetchPersistedSummary?: () => void;
}) => {
  const { inference } = useKibana().services;
  const { fetchEntityDetailsHighlights, saveEntityAiSummary } = useEntityAnalyticsRoutes();
  const { addError } = useAppToasts();
  const currentUser = useCurrentUser();
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [assistantResult, setAssistantResult] = useState<AssistantResult>(() =>
    storedSummary ? buildResultFromStoredSummary(storedSummary) : null
  );

  // True once the user has clicked Generate in this mount cycle.
  // Prevents the async entity record arrival from overwriting a freshly generated result.
  const userTriggeredGeneration = useRef(false);

  // Entity signals at generation time — suppresses false staleness until live signals drift.
  const [generationBaseline, setGenerationBaseline] =
    useState<EntitySummaryStalenessEntitySnapshot | null>(null);

  // The entity record (and therefore storedSummary) may arrive AFTER initial render
  // because the flyout fetches it asynchronously. This effect hydrates the result
  // from the stored summary once it becomes available, but only if the user hasn't
  // already generated a fresh one.
  useEffect(() => {
    if (storedSummary && !userTriggeredGeneration.current) {
      setAssistantResult(buildResultFromStoredSummary(storedSummary));
    }
  }, [storedSummary]);

  useEffect(() => {
    setGenerationBaseline(null);
    userTriggeredGeneration.current = false;
  }, [entityType, entityIdentifier]);

  const fetchEntityHighlights = useCallback(async () => {
    const errorTitle = i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.highlights.fetch.errorTitle',
      {
        defaultMessage: `Failed to run LLM`,
      }
    );

    // Clear any previously shown error while a new generation attempt is in progress
    setError(null);

    // Enter the loading state before the pre-inference fetch so the Generate button can't be
    // re-clicked while entity data is gathered. The try/finally below always resets it.
    const controller = new AbortController();
    setAbortController(controller);
    setIsGeneratingSummary(true);

    try {
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

      // Capture the raw counts the model produced before capping, so persist-time telemetry
      // can measure overshoot (the persisted/capped doc can't reveal it on its own).
      const modelHighlightsCount = typedOutput.highlights.length;
      const modelRecommendedActionsCount = typedOutput.recommended_actions?.length ?? 0;

      // Apply the structural caps up front so the in-session view matches the persisted
      // document (which the server also caps) — avoids showing more items now than after
      // a reopen. Caps counts rather than truncating prose.
      const { highlights, recommended_actions: recommendedActions } = capEntitySummaryContent({
        highlights: typedOutput.highlights,
        recommended_actions: typedOutput.recommended_actions,
      });
      const cappedOutput: EntityHighlightsResponse = {
        highlights,
        recommended_actions: recommendedActions,
      };

      userTriggeredGeneration.current = true;
      setGenerationBaseline(entitySnapshot ?? null);
      setAssistantResult({
        summaryAsText: summaryFormatted,
        response: cappedOutput,
        replacements,
        generatedAt,
        generatedBy,
      });

      // Persist to entity store — fire-and-forget, don't block UI on this
      saveEntityAiSummary({
        entityId: entityIdentifier,
        entityType,
        summary: {
          highlights,
          recommended_actions: recommendedActions,
          generated_at: generatedAt,
          staleness: buildEntitySummaryStaleness({
            riskScoreNorm: entitySnapshot?.riskScoreNorm ?? null,
          }),
        },
        modelOutputCounts: {
          highlights: modelHighlightsCount,
          recommendedActions: modelRecommendedActionsCount,
        },
      })
        .then(() => {
          // Keep `generationBaseline` as the staleness-suppression source for this session.
          // The metadata write isn't immediately searchable (index refresh latency), so
          // clearing the baseline here and leaning on the read-back below would flash the
          // staleness nudge back on right after a successful regeneration (the read-back
          // still returns the pre-regeneration snapshot). The baseline is reset on entity
          // change and superseded by the next generation; genuine later drift still surfaces
          // via the drift-since-generation check.
          refetchEntityRecord?.();
          // Pull the just-persisted summary from the metadata datastream so a
          // reopen (or another user) reads the same document, not a stale cache.
          refetchPersistedSummary?.();
        })
        .catch((persistError: Error) => {
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
      setIsGeneratingSummary(false);
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
    refetchEntityRecord,
    refetchPersistedSummary,
  ]);

  const abortStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGeneratingSummary(false);
    }
  }, [abortController]);

  return {
    fetchEntityHighlights,
    isGeneratingSummary,
    abortStream,
    result: assistantResult,
    error,
    /** Signals at last in-session generation; used to avoid false staleness until entity data drifts. */
    generationBaseline,
  };
};
