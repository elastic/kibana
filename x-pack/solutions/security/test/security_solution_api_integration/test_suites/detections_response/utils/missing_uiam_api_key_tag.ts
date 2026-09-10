/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * On MKI, rules created with an ES API key and no UIAM key get this tag appended by the alerting
 * framework (see https://github.com/elastic/kibana/pull/289195). It is not present locally/ESS, so
 * tests strip it to keep tag assertions stable in both environments. Kept as a literal to avoid
 * importing from the alerting plugin's server internals; mirrors MISSING_UIAM_API_KEY_TAG in the
 * alerting plugin.
 */
export const MISSING_UIAM_API_KEY_TAG = 'Missing Elastic Cloud API Key';

/**
 * Removes the environment-specific "Missing Elastic Cloud API Key" tag (see MISSING_UIAM_API_KEY_TAG)
 * from a tags array so assertions hold on both ESS/local and MKI.
 */
export const stripMissingUiamApiKeyTag = (tags: readonly string[] = []): string[] =>
  tags.filter((tag) => tag !== MISSING_UIAM_API_KEY_TAG);
