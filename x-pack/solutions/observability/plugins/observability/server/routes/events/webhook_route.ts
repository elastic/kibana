/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { EventsService } from '../../lib/events/events_service';
import type { ExternalEventInput, EventSeverity, EventStatus } from '../../../common/types/events';

/**
 * Register the webhook route directly with the router to bypass strict validation.
 * This allows external services like Datadog to send any JSON payload.
 */
export function registerWebhookRoute(core: CoreSetup, logger: Logger) {
  const router = core.http.createRouter();

  router.post(
    {
      path: '/api/observability/events/webhook',
      security: {
        authz: {
          enabled: false,
          reason: 'Webhook endpoint authenticated via token parameter',
        },
        authc: {
          enabled: false,
          reason: 'Webhook endpoint for external services - authenticated via webhook_token parameter',
        },
      },
      options: {
        access: 'public',
        // Disable XSRF protection - external services like Datadog won't send kbn-xsrf header
        xsrfRequired: false,
      },
      validate: {
        query: schema.object({
          connector_id: schema.string(),
          webhook_token: schema.string(),
        }),
        // Use schema.any() to accept any JSON body without strict validation
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      const { connector_id: connectorId, webhook_token: webhookToken } = request.query;
      const body = request.body as Record<string, unknown>;

      // Debug logging - dump the raw payload
      logger.info(`[Webhook] Received payload from connector ${connectorId}:`);
      logger.info(`[Webhook] Raw body: ${JSON.stringify(body, null, 2)}`);
      logger.info(`[Webhook] Body keys: ${Object.keys(body || {}).join(', ')}`);

      // For PoC: Accept any non-empty token
      // In production, validate against connector's stored webhook token
      if (!webhookToken || webhookToken.length < 8) {
        logger.error(`[Webhook] Invalid webhook token: ${webhookToken}`);
        return response.badRequest({ body: { message: 'Invalid webhook token' } });
      }

      try {
        const coreContext = await context.core;
        // Use internal user for webhook endpoint since it's unauthenticated
        const esClient = coreContext.elasticsearch.client.asInternalUser;
        const eventsService = new EventsService(esClient);

        // Transform webhook payload to our event format
        // Try to detect the format and extract fields
        const title =
          (body.title as string) ||
          (body.alertTitle as string) ||
          ((body.raw_payload as Record<string, unknown>)?.eventTitle as string) ||
          'External Alert';

        const message =
          (body.message as string) ||
          (body.alertMessage as string) ||
          ((body.raw_payload as Record<string, unknown>)?.eventMsg as string) ||
          'No message provided';

        const severity =
          (body.severity as string) ||
          mapDatadogAlertType(
            (body.alertType as string) ||
              ((body.raw_payload as Record<string, unknown>)?.alertPriority as string) ||
              'info'
          );

        const source = (body.source as string) || 'datadog';

        // Determine status from various possible fields
        const alertTransition =
          ((body.raw_payload as Record<string, unknown>)?.alertTransition as string) ||
          (body.status as string) ||
          '';
        const status = alertTransition.toLowerCase().includes('recover') ? 'resolved' : 'open';

        const monitorId =
          (body.monitor_id as string | number) ||
          ((body.raw_payload as Record<string, unknown>)?.alertId as string);

        // Extract group information for multi-group monitors (e.g., "host:web-1,env:prod")
        const alertScope =
          ((body.raw_payload as Record<string, unknown>)?.alertScope as string) || '';

        // Generate fingerprint: source + monitor_id + group (for deduplication)
        // This matches Keep's approach: fingerprint = monitor_id for single-group, (monitor_id, group) for multi-group
        const fingerprint = generateFingerprint(source, String(monitorId || ''), alertScope);

        logger.info(
          `[Webhook] Parsed - title: ${title}, severity: ${severity}, status: ${status}, monitorId: ${monitorId}, scope: ${alertScope}, fingerprint: ${fingerprint}`
        );

        // Try to find existing alert by fingerprint
        const existingAlert = await eventsService.findAlertByFingerprint(fingerprint);

        if (existingAlert) {
          logger.info(
            `[Webhook] Found existing alert ${existingAlert.id} with fingerprint ${fingerprint}`
          );

          if (status === 'resolved') {
            // Resolve the existing alert
            const updated = await eventsService.updateAlertStatus(existingAlert.id, 'resolved');
            logger.info(`[Webhook] Resolved existing alert: ${existingAlert.id}`);
            return response.ok({
              body: { event: updated, received: true, action: 'resolved' },
            });
          } else {
            // Update the existing alert (re-triggered) - update timestamp and message but keep same ID
            const updated = await eventsService.updateAlert(existingAlert.id, {
              title,
              message,
              severity: severity as EventSeverity,
              status: 'open',
              timestamp: new Date().toISOString(),
              raw_payload: {
                ...body,
                ...(monitorId && { monitor_id: monitorId }),
              },
            });
            logger.info(`[Webhook] Updated existing alert: ${existingAlert.id}`);
            return response.ok({
              body: { event: updated, received: true, action: 'updated' },
            });
          }
        }

        // No existing alert found - create new one
        logger.info(`[Webhook] No existing alert found for fingerprint ${fingerprint}, creating new`);

        const eventInput: ExternalEventInput = {
          title,
          message,
          severity: severity as EventSeverity,
          source,
          status: status as EventStatus,
          timestamp: new Date().toISOString(),
          tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
          raw_payload: {
            ...body,
            ...(monitorId && { monitor_id: monitorId }),
          },
          connector_id: connectorId,
          fingerprint, // Store fingerprint for future lookups
        };

        const event = await eventsService.createEvent(eventInput);
        logger.info(`[Webhook] Event created with id: ${event.id}, fingerprint: ${fingerprint}`);

        return response.ok({
          body: { event, received: true },
        });
      } catch (error) {
        logger.error(`[Webhook] Error processing webhook: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Error processing webhook: ${error}` },
        });
      }
    }
  );
}

/**
 * Generates a fingerprint for deduplication.
 * For single-group monitors: source + monitor_id
 * For multi-group monitors: source + monitor_id + group
 */
function generateFingerprint(source: string, monitorId: string, group: string): string {
  const parts = [source, monitorId];
  if (group && group.trim()) {
    parts.push(group.trim());
  }
  return parts.join(':');
}

/**
 * Maps Datadog alert type/priority to our severity levels
 */
function mapDatadogAlertType(alertType: string): EventSeverity {
  const type = alertType.toLowerCase();
  if (type === 'p1' || type === 'error' || type === 'critical') {
    return 'critical';
  }
  if (type === 'p2' || type === 'warning') {
    return 'high';
  }
  if (type === 'p3') {
    return 'medium';
  }
  if (type === 'p4' || type === 'info') {
    return 'low';
  }
  if (type === 'success' || type === 'recovery' || type === 'recovered') {
    return 'info';
  }
  return 'medium';
}

