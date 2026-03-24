/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Structured JSON response from the entity details highlights AI assistant
 */
export interface EntityHighlightItem {
  title: string;
  text: string;
}

export interface EntityHighlightsResponse {
  highlights: EntityHighlightItem[];
  recommendedActions: string[] | null;
}
