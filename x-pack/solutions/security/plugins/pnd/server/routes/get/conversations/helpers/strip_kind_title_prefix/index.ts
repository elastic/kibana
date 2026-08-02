/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder title prefixes for investigation and incident conversations.
 *
 * PND cannot put nesting or type badges on Agent Builder, so these tags are
 * written into the stored title (D5). PND's own surfaces strip them via
 * {@link stripKindTitlePrefix} — two surfaces, two mechanisms.
 */
const KIND_TITLE_PREFIX = /^\[(?:Investigation|Incident)\]\s+/;

/**
 * Remove the Agent Builder `[Investigation]` / `[Incident]` prefix from a stored title.
 *
 * `[Tuning]` is not a current prefix and is left alone. Thread titles are agent-written
 * and never carry these tags.
 */
export const stripKindTitlePrefix = (title: string): string => title.replace(KIND_TITLE_PREFIX, '');
