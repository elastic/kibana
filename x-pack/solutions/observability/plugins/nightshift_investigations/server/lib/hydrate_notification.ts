/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Markdown fragment for one hydrate node. Empty when this turn wrote no new files. */
export const formatHydrateNotification = (
  heading: string,
  items: ReadonlyArray<{ path: string }>
): string => {
  if (items.length === 0) {
    return '';
  }
  return [heading, ...items.map((item) => `- \`${item.path}\``)].join('\n');
};

/**
 * Join non-empty hydrate fragments into model-only context. Nodes do not wrap;
 * this is the only place that builds the `<system_update>` tag.
 */
export const composeHydrateNotificationContext = ({
  notifications,
}: {
  notifications: ReadonlyArray<string | null | undefined>;
}): { model_context?: string } => {
  const fragments = notifications
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  if (fragments.length === 0) {
    return {};
  }
  return {
    model_context: `<system_update>\n${fragments.join('\n\n')}\n</system_update>`,
  };
};
