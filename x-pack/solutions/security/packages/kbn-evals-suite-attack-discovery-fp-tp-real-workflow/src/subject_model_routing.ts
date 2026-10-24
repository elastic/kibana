/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { EvalConnector } from '@kbn/evals';
import { FP_TP_INFERENCE_FEATURE_ID } from '@kbn/evals-suite-attack-discovery-fp-tp/src/constants';
import { overrideInferenceFeature } from '@kbn/evals-suite-attack-discovery-fp-tp/src/inference_override';

/**
 * The analysis workflow's `ai.agent` step resolves its connector from the
 * `alertzero_reasoning` inference feature (`connector-id-by-feature`), not from the
 * Playwright project's connector. Without this override every project/model column
 * runs the space default connector.
 *
 * Routes that feature to the project's connector; call the returned function to put the
 * previous inference settings back.
 */
export const routeSubjectModel = async ({
  fetch,
  connector,
}: {
  fetch: HttpHandler;
  connector: Pick<EvalConnector, 'id'>;
}): Promise<() => Promise<void>> =>
  overrideInferenceFeature({
    fetch,
    featureId: FP_TP_INFERENCE_FEATURE_ID,
    endpointId: connector.id,
  });
