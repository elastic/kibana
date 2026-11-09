/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-security';
import {
  WORKFLOW_INSIGHTS_PENDING_ROUTE,
  WORKFLOW_INSIGHTS_ROUTE,
} from '../../../../../common/endpoint/constants';

/** Served by the inference plugin; `useLoadConnectors` adds `?featureId=defend_insights`. */
const INFERENCE_CONNECTORS_ROUTE = '/internal/search_inference_endpoints/connectors';

export interface MockInferenceConnector {
  readonly connectorId: string;
  readonly name: string;
}

/**
 * Answers GET requests to exactly `apiPath`, in any space (`/s/<space>/...`) and with any query
 * string, with a JSON `body`. Other methods go on to the next handler. The match compares the end
 * of the pathname because `WORKFLOW_INSIGHTS_PENDING_ROUTE` is a sub-path of
 * `WORKFLOW_INSIGHTS_ROUTE`: a prefix or glob match would answer both routes with one handler.
 */
const fulfillGet = async (page: ScoutPage, apiPath: string, body: unknown): Promise<void> => {
  await page.route(
    (url) => url.pathname.endsWith(apiPath),
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
  );
};

/**
 * Serves one inference connector to the workflow insights connector selector, so no real
 * connector (and no secret) is needed. The body uses `connectorId`, as the API does:
 * `@kbn/inference-connectors` maps it to the selector option id.
 */
export const mockInferenceConnectors = async (
  page: ScoutPage,
  { connectorId, name }: MockInferenceConnector
): Promise<void> => {
  await fulfillGet(page, INFERENCE_CONNECTORS_ROUTE, {
    connectors: [
      {
        connectorId,
        name,
        type: '.bedrock',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isMissingSecrets: false,
      },
    ],
    soEntryFound: false,
  });
};

/**
 * Workflow insights with no scan running and no stored results. The section starts with
 * the Scan button disabled until the first pending response is empty.
 */
export const mockIdleWorkflowInsights = async (page: ScoutPage): Promise<void> => {
  await fulfillGet(page, WORKFLOW_INSIGHTS_PENDING_ROUTE, { pending: [] });
  await fulfillGet(page, WORKFLOW_INSIGHTS_ROUTE, []);
};
