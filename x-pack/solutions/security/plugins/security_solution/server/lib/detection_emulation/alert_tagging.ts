/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * Field names for emulation metadata on alerts.
 * These fields are written to alerts during emulation runs to enable
 * filtering and tracking of emulation-generated alerts.
 */
export const ALERT_EMULATION_ID = 'kibana.alert.emulation.id';
export const ALERT_EMULATION_MODE = 'kibana.alert.emulation.mode';

/**
 * Emulation mode indicates how the alert was generated.
 * - 'test': Alert generated during a test emulation run
 * - 'validation': Alert generated during validation/verification
 * - 'production': Alert generated during production emulation (if enabled)
 */
export type EmulationMode = 'test' | 'validation' | 'production';

export interface EmulationAlertMetadata {
  /**
   * Unique identifier for the emulation run that generated this alert
   */
  emulationId: string;

  /**
   * Mode of the emulation run
   */
  mode: EmulationMode;
}

export interface TagAlertsWithEmulationOptions {
  /**
   * Elasticsearch client for updating alert documents
   */
  esClient: ElasticsearchClient;

  /**
   * Alert IDs to tag with emulation metadata
   */
  alertIds: string[];

  /**
   * Emulation metadata to write to the alerts
   */
  metadata: EmulationAlertMetadata;

  /**
   * Index pattern for alerts (defaults to .alerts-security.alerts-*)
   */
  alertsIndex?: string;

  /**
   * Logger instance
   */
  logger: Logger;
}

/**
 * Tags alerts with emulation metadata by updating the alert documents
 * with kibana.alert.emulation.{id,mode} fields.
 *
 * This function enables filtering and tracking of alerts generated during
 * emulation runs by writing structured emulation context directly to the
 * alert documents. The metadata includes:
 * - emulationId: Unique identifier for the emulation run
 * - mode: The emulation mode (test, validation, production)
 *
 * Example usage:
 * ```typescript
 * await tagAlertsWithEmulation({
 *   esClient,
 *   alertIds: ['alert-123', 'alert-456'],
 *   metadata: {
 *     emulationId: 'emulation-abc-123',
 *     mode: 'test'
 *   },
 *   logger
 * });
 * ```
 *
 * @param options - Configuration for tagging alerts
 * @returns Promise resolving to the number of alerts successfully tagged
 * @throws Error if the update operation fails
 */
export async function tagAlertsWithEmulation(
  options: TagAlertsWithEmulationOptions
): Promise<number> {
  const {
    esClient,
    alertIds,
    metadata,
    alertsIndex = '.alerts-security.alerts-*',
    logger,
  } = options;

  if (alertIds.length === 0) {
    logger.debug('No alerts to tag with emulation metadata');
    return 0;
  }

  logger.debug(
    `Tagging ${alertIds.length} alerts with emulation metadata: emulationId=${metadata.emulationId}, mode=${metadata.mode}`
  );

  try {
    // Elasticsearch v8 client expects `query` / `script` at the top level of
    // the params object — the legacy `body: { ... }` wrapper triggers the
    // overload mismatch we saw under typecheck. Also note: `params` is the
    // Painless script-params object (untyped JSON), so the values are
    // serialised as-is by ES.
    const response = await esClient.updateByQuery({
      index: alertsIndex,
      refresh: true,
      query: {
        ids: {
          values: alertIds,
        },
      },
      script: {
        source: `
          ctx._source['${ALERT_EMULATION_ID}'] = params.emulationId;
          ctx._source['${ALERT_EMULATION_MODE}'] = params.mode;
        `,
        lang: 'painless',
        params: {
          emulationId: metadata.emulationId,
          mode: metadata.mode,
        },
      },
    });

    const updatedCount = response.updated ?? 0;

    if (updatedCount !== alertIds.length) {
      logger.warn(
        `Expected to update ${alertIds.length} alerts but updated ${updatedCount}. ` +
          `Failures: ${response.failures?.length ?? 0}`
      );
    } else {
      logger.info(
        `Successfully tagged ${updatedCount} alerts with emulation metadata: emulationId=${metadata.emulationId}`
      );
    }

    if (response.failures && response.failures.length > 0) {
      // Logger meta must be a `LogMeta` shape, not the bare failures array.
      logger.error(`Encountered ${response.failures.length} failures while tagging alerts.`, {
        tags: ['detection-emulation'],
        failures: response.failures,
      } as unknown as Record<string, unknown>);
    }

    return updatedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to tag alerts with emulation metadata: ${errorMessage}`, error);
    throw new Error(`Failed to tag alerts with emulation metadata: ${errorMessage}`);
  }
}

/**
 * Builds an Elasticsearch query to filter alerts by emulation ID.
 * Use this helper when querying alerts to filter by emulation context.
 *
 * Example usage:
 * ```typescript
 * const query = buildEmulationAlertQuery('emulation-abc-123');
 * const response = await esClient.search({
 *   index: '.alerts-security.alerts-*',
 *   body: { query }
 * });
 * ```
 *
 * @param emulationId - The emulation ID to filter by
 * @returns Elasticsearch query object
 */
export function buildEmulationAlertQuery(emulationId: string) {
  return {
    term: {
      [ALERT_EMULATION_ID]: emulationId,
    },
  };
}

/**
 * Builds an Elasticsearch query to filter alerts by emulation mode.
 *
 * @param mode - The emulation mode to filter by
 * @returns Elasticsearch query object
 */
export function buildEmulationModeQuery(mode: EmulationMode) {
  return {
    term: {
      [ALERT_EMULATION_MODE]: mode,
    },
  };
}

/**
 * Extracts emulation metadata from an alert document.
 * Returns undefined if the alert does not have emulation metadata.
 *
 * @param alert - The alert document (any structure with string keys)
 * @returns Emulation metadata if present, undefined otherwise
 */
export function extractEmulationMetadata(
  alert: Record<string, unknown>
): EmulationAlertMetadata | undefined {
  const emulationId = alert[ALERT_EMULATION_ID];
  const mode = alert[ALERT_EMULATION_MODE];

  if (typeof emulationId === 'string' && typeof mode === 'string') {
    return {
      emulationId,
      mode: mode as EmulationMode,
    };
  }

  return undefined;
}

/**
 * Checks if an alert document has emulation metadata.
 *
 * @param alert - The alert document to check
 * @returns True if the alert has emulation metadata
 */
export function isEmulationAlert(alert: Record<string, unknown>): boolean {
  return extractEmulationMetadata(alert) !== undefined;
}
