/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves a watchlist **name** to its canonical id against a list of watchlists.
 *
 * Match order: exact name (case-insensitive) → unique substring match. Returns an actionable
 * `error` for ambiguous or unknown names.
 */
export const resolveWatchlistByName = (
  name: string,
  watchlists: { id: string; name: string }[]
): { id: string } | { error: string } => {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const exactByName = watchlists.filter((w) => w.name.toLowerCase() === lower);
  if (exactByName.length === 1) {
    return { id: exactByName[0].id };
  }
  if (exactByName.length > 1) {
    return {
      error: `Multiple watchlists are named "${trimmed}". Pass the watchlist id instead. Candidates: ${exactByName
        .map((w) => `${w.name} (${w.id})`)
        .join(', ')}.`,
    };
  }

  const substringMatches = watchlists.filter((w) => w.name.toLowerCase().includes(lower));
  if (substringMatches.length === 1) {
    return { id: substringMatches[0].id };
  }
  if (substringMatches.length > 1) {
    return {
      error: `"${trimmed}" matches multiple watchlists: ${substringMatches
        .map((w) => w.name)
        .join(', ')}. Use the exact name or the watchlist id.`,
    };
  }

  return {
    error: `No watchlist found matching "${trimmed}". Use security.list_watchlists to see available watchlists.`,
  };
};
