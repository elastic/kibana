/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag for enabling Natural Language Threat Hunting functionality.
 * When enabled, allows users to threat hunt using natural language with an AI Agent.
 * This feature registers the entity analytics tool for OneChat.
 */
export const NATURAL_LANGUAGE_THREAT_HUNTING_FEATURE_FLAG =
  'securitySolution.naturalLanguageThreatHunting.enabled';
export const NATURAL_LANGUAGE_THREAT_HUNTING_FEATURE_FLAG_DEFAULT = false;
