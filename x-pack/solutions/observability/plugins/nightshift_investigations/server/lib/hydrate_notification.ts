/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/** Markdown fragment for one hydrate node. Empty when this turn wrote no new files. */
export const formatHydrateNotification = (
  heading: string,
  items: ReadonlyArray<{ path: string; detail?: string }>
): string => {
  if (items.length === 0) {
    return '';
  }
  return [
    heading,
    ...items.map((item) => `- \`${item.path}\`${item.detail ? ` (${item.detail})` : ''}`),
  ].join('\n');
};

/**
 * One line telling the model that a writer's directory did not materialize.
 *
 * Used both by the writer handlers (which catch their own failures) and by the
 * compose step (which covers the branch-timeout case, where the writer produced
 * no output at all and so cannot report the failure itself).
 */
export const formatIncompleteMaterializationNotice = (directory: string): string =>
  `Materialization of ${directory.replace(/\/$/, '')}/ encountered an error; ` +
  'its contents may be incomplete or missing.';

/**
 * The failure half of a workspace writer's contract: log it, and tell the model the directory
 * may be incomplete. A writer step must not throw — materialize runs before the investigator
 * and as the reinforcement agent's before-agent hook, so a failed writer would abort a round
 * over one directory.
 */
export const degradeOnWriterFailure = ({
  logger,
  label,
  sandboxId,
  directory,
  error,
}: {
  logger: Logger;
  /** What the log line calls this writer, e.g. `'Cortex hydrate'`. */
  label: string;
  sandboxId: string;
  directory: string;
  error: unknown;
}): { failed: true; notification: string } => {
  logger.error(
    `${label} failed for sandbox ${sandboxId}: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  return { failed: true, notification: formatIncompleteMaterializationNotice(directory) };
};

/** One workspace writer, as reported to {@link composeHydrateNotificationContext}. */
export interface HydrateWriter {
  /** Absolute sandbox directory this writer materializes into. */
  directory: string;
  /** The writer's own markdown fragment, empty when it wrote nothing. */
  notification?: string | null;
  /**
   * False when the writer produced no output at all — a branch killed by
   * `branch-timeout`, which never reaches its handler. Such a writer cannot
   * report the failure itself, so the notice is synthesized from `directory`.
   */
  completed?: boolean;
}

/**
 * Join non-empty hydrate fragments into model-only context. Nodes do not wrap;
 * this is the only place that builds the `<system_update>` tag.
 */
export const composeHydrateNotificationContext = ({
  writers,
}: {
  writers: ReadonlyArray<HydrateWriter>;
}): { model_context?: string } => {
  const fragments = writers
    .flatMap((writer) => {
      const notification =
        typeof writer.notification === 'string' ? writer.notification.trim() : '';
      if (notification.length > 0) {
        // A handler that caught its own failure already reported the reason.
        return [notification];
      }
      return writer.completed === false
        ? [formatIncompleteMaterializationNotice(writer.directory)]
        : [];
    })
    .filter((entry) => entry.length > 0);
  if (fragments.length === 0) {
    return {};
  }
  return {
    model_context: `<system_update>\n${fragments.join('\n\n')}\n</system_update>`,
  };
};
