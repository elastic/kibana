/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

/** The pinned ClaimGrounding judge family (same judge as the FP/TP suite, #295913). */
export const REQUIRED_JUDGE_MODEL = 'gemini-3-1-pro';

const connectorLabel = (connector: EvalConnector): string =>
  [connector.id, connector.name].filter(Boolean).join(' / ');

/**
 * Judge isolation. The ClaimGrounding judge must not be the model under test
 * (self-judging inflates the score), and it must be the pinned judge so cells
 * stay comparable. Throws on either violation; logs the judge otherwise.
 */
export const assertJudgeIsolation = ({
  connector,
  evaluationConnector,
  log,
}: {
  connector: EvalConnector;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}): void => {
  if (evaluationConnector.id === connector.id) {
    throw new Error(
      `Judge isolation violated: the evaluation connector (${connectorLabel(
        evaluationConnector
      )}) is the connector under test. Configure a separate judge (${REQUIRED_JUDGE_MODEL}).`
    );
  }
  const judge = connectorLabel(evaluationConnector);
  if (!judge.toLowerCase().includes(REQUIRED_JUDGE_MODEL)) {
    throw new Error(
      `ClaimGrounding judge must be ${REQUIRED_JUDGE_MODEL}; got ${judge}. Set the evaluation connector to eis-google-${REQUIRED_JUDGE_MODEL}.`
    );
  }
  log.info(`ClaimGrounding judge: ${judge}; model under test: ${connectorLabel(connector)}`);
};
