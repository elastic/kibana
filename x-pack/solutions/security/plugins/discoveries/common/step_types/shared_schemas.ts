/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Reusable schema for anonymized alert documents passed between workflow steps.
 */
export const AnonymizedAlertSchema = z.object({
  id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  page_content: z.string(),
});

export type AnonymizedAlert = z.infer<typeof AnonymizedAlertSchema>;

/**
 * Reusable schema for connector / LLM configuration passed between workflow steps.
 */
export const ApiConfigSchema = z.object({
  action_type_id: z.string().optional(),
  connector_id: z.string(),
  default_system_prompt_id: z.string().optional(),
  model: z.string().optional(),
  provider: z.enum(['OpenAI', 'Azure OpenAI', 'Other']).optional(),
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * An entity correlated with an attack discovery: the Entity Store EUID
 * (stored as-is, e.g. `user:jdoe`) and the entity type.
 */
export const AttackDiscoveryEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
});

export type AttackDiscoveryEntity = z.infer<typeof AttackDiscoveryEntitySchema>;

/**
 * An observable extracted from the alerts behind an attack discovery that did
 * NOT match an Entity Store entity. `type_key` mirrors the Cases observable
 * type keys (e.g. `observable-type-ipv4`).
 */
export const AttackDiscoveryObservableEntitySchema = z.object({
  type_key: z.string(),
  value: z.string(),
});

export type AttackDiscoveryObservableEntity = z.infer<typeof AttackDiscoveryObservableEntitySchema>;

/**
 * Reusable schema for a single generated attack discovery.
 */
export const AttackDiscoverySchema = z.object({
  alert_ids: z.array(z.string()),
  details_markdown: z.string(),
  entities: z.array(AttackDiscoveryEntitySchema).optional(),
  entity_summary_markdown: z.string().optional(),
  id: z.string().optional(),
  mitre_attack_tactics: z.array(z.string()).optional(),
  observable_entities: z.array(AttackDiscoveryObservableEntitySchema).optional(),
  summary_markdown: z.string(),
  timestamp: z.string().optional(),
  title: z.string(),
});

export type AttackDiscovery = z.infer<typeof AttackDiscoverySchema>;
