/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, Logger } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { CreateAlertTriageJobRequestBody } from '@kbn/security-solution-plugin/common/api/assistant/alert_triage';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { buildSiemResponse } from '../../../lib/detection_engine/routes/utils';
import { AlertTriageService } from '../../service/alert_triage';

export const createAlertTriageJobHandler = (
  logger: Logger
): RequestHandler<
  never,
  never,
  CreateAlertTriageJobRequestBody,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);

    try {
      // Get the core context
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = coreContext.savedObjects.client;

      // Get the security solution context for inference client
      const securitySolutionContext = await context.securitySolution;

      const chatModel = await securitySolutionContext.getInferenceChatModel({
        connectorId: request.body.connectorId,
        chatModelOptions: { }
      });

      // Get the alerts client
      const alertsClient = await securitySolutionContext.getRacClient(request);

      // Get the app client for alerts index
      const appClient = securitySolutionContext.getAppClient();
      const alertsIndex = appClient.getAlertsIndex();

      // Extract request parameters
      const { connectorId, alertIds } = request.body;

      logger.info(
        `Creating ${alertIds.length} alert triage job(s) with connectorId: ${connectorId}`
      );

      // Create a separate job for each alert
      const jobs = alertIds.map((alertId) => {
        const jobId = uuidv4();

        logger.debug(`Starting alert triage job ${jobId} for alert ${alertId}`);

        // Create service instance
        const alertTriageService = new AlertTriageService(
          {
            esClient,
            savedObjectsClient,
            alertsClient,
            alertsIndex,
            chatModel,
            request,
            logger,
          }
        );

        // Fire and forget - don't await the processing
        alertTriageService
          .processAlertTriageJob({
            connectorId,
            alertId,
            jobId,
          })
          .then((result) => {
            logger.info(
              `Alert triage job ${jobId} for alert ${alertId} completed successfully`
            );
            // TODO: Store results, update status, write event logs
          })
          .catch((error) => {
            console.error(error)
            logger.error(
              `Alert triage job ${jobId} for alert ${alertId} failed: ${error.message}`,
              error
            );
            // TODO: Store error, update status, write failure event logs
          });

        return { alertId, jobId };
      });

      // Return immediately with job IDs
      return response.ok({
        body: {
          success: true,
          message: `Created ${jobs.length} alert triage job(s) successfully`,
          jobs,
        },
      });
    } catch (err) {
      const error = transformError(err);
      logger.error(`Error creating alert triage jobs: ${error.message}`);

      return siemResponse.error({
        statusCode: error.statusCode ?? 500,
        body: error.message,
      });
    }
  };
};

