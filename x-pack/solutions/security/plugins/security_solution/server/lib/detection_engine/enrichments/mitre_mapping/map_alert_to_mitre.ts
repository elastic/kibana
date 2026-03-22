/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { MitreMapping } from './types';
import { extractSecurityFeatures, hasSufficientContext } from './extract_security_features';
import { buildMitrePrompt } from './build_mitre_prompt';
import { parseMitreResponse } from './parse_mitre_response';

/**
 * LLM client interface for MITRE mapping.
 * Compatible with LangChain ChatAnthropic and similar LLM clients.
 */
export interface LLMClient {
  invoke(messages: BaseMessage[] | Array<{ role: string; content: string }>): Promise<{
    content: string;
  }>;
}

/**
 * Maps a security alert to MITRE ATT&CK techniques using LLM reasoning.
 *
 * Workflow:
 * 1. Extract security-relevant fields (process, network, file, registry)
 * 2. Check if sufficient context exists for mapping
 * 3. Build structured LLM prompt with MITRE taxonomy
 * 4. Invoke LLM (Claude Haiku for speed/cost)
 * 5. Parse and validate LLM response
 * 6. Return structured MITRE mapping
 *
 * Error handling:
 * - Graceful degradation (returns null on failure)
 * - Doesn't block alert creation (async enrichment)
 * - Logs errors for debugging
 *
 * Performance:
 * - Cache miss: 200-500ms (LLM call)
 * - Cache hit: <1ms (see mitre_cache.ts)
 *
 * @param alert - Raw security alert with ECS fields
 * @param llmClient - Claude Haiku client (or compatible LLM)
 * @returns MITRE mapping or null if insufficient data/error
 */
export async function mapAlertToMitre(
  alert: Record<string, any>,
  llmClient: LLMClient
): Promise<MitreMapping | null> {
  try {
    // Step 1: Extract security features
    const features = extractSecurityFeatures(alert);

    // Step 2: Early return if insufficient context
    if (!hasSufficientContext(features)) {
      return null; // Not enough data for meaningful MITRE mapping
    }

    // Step 3: Build LLM prompt
    const prompt = buildMitrePrompt(features);

    // Step 4: Invoke LLM
    const response = await llmClient.invoke([{ role: 'user', content: prompt }]);

    // Step 5: Parse and validate response
    const mapping = parseMitreResponse(response.content as string);

    // Return null if no techniques found (empty mapping not useful)
    if (mapping.techniques.length === 0) {
      return null;
    }

    return mapping;
  } catch (error) {
    // Log error for debugging but don't fail alert creation
    console.error('[MITRE Auto-Mapper] Mapping failed:', error);
    return null; // Graceful degradation
  }
}

/**
 * Maps alert to MITRE with caching layer.
 * Checks cache before invoking LLM to reduce costs and latency.
 *
 * @param alert - Raw security alert
 * @param llmClient - LLM client
 * @param cache - Optional cache implementation
 * @returns MITRE mapping or null
 */
export async function mapAlertToMitreWithCache(
  alert: Record<string, any>,
  llmClient: LLMClient,
  cache?: {
    get: (key: string) => MitreMapping | null;
    set: (key: string, value: MitreMapping) => void;
  }
): Promise<MitreMapping | null> {
  const features = extractSecurityFeatures(alert);

  if (!hasSufficientContext(features)) {
    return null;
  }

  // Check cache first (if provided)
  if (cache) {
    const cacheKey = buildCacheKey(features);
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached; // Cache hit - return immediately
    }
  }

  // Cache miss - call LLM
  const mapping = await mapAlertToMitre(alert, llmClient);

  // Store in cache for future use
  if (cache && mapping) {
    const cacheKey = buildCacheKey(features);
    cache.set(cacheKey, mapping);
  }

  return mapping;
}

/**
 * Builds cache key from security features.
 * Uses a subset of features to maximize cache hit rate while maintaining accuracy.
 */
function buildCacheKey(features: Record<string, any>): string {
  // Hash key components: process + command (truncated) + action + network + file
  const keyComponents = [
    features.processName || '',
    (features.processCommandLine || '').substring(0, 100), // Truncate for cache efficiency
    features.eventAction || '',
    `${features.networkProtocol || ''}-${features.networkDirection || ''}`,
    features.fileName || '',
  ];

  return keyComponents.join('|');
}
