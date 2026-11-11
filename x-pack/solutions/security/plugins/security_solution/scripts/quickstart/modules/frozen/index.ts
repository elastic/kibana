/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  IlmExplainLifecycleLifecycleExplain,
  IlmExplainLifecycleLifecycleExplainManaged,
  IlmMoveToStepStepKey,
} from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';

export const setIlmPollInterval = async ({
  client,
  interval = '10s',
}: {
  client: Client;
  interval: string;
}) => {
  client.cluster.putSettings({
    persistent: { 'indices.lifecycle.poll_interval': interval },
  });
};

const getActionAndStep = ({
  ilmExplain,
}: {
  ilmExplain: IlmExplainLifecycleLifecycleExplain;
}): { action: string | undefined; step: string | undefined } => {
  return {
    action: (ilmExplain as IlmExplainLifecycleLifecycleExplainManaged).action,
    step: (ilmExplain as IlmExplainLifecycleLifecycleExplainManaged).step,
  };
};

/**
 * Immediately move the write index for an index alias to frozen. This works, but in testing weird behaviors happen sometimes like rollover skipping
 * over numbers for backing indices. Use with caution.
 */
export const moveWriteIndexToFrozen = async ({
  alias,
  client,
  log,
}: {
  alias: string;
  client: Client;
  log: ToolingLog;
}) => {
  const rolloverResp = await client.indices.rollover({ alias });
  log.info(
    `Rolled over index, old index: ${rolloverResp.old_index}, new index: ${rolloverResp.new_index}`
  );
  const oldIndex = rolloverResp.old_index;

  const ilmExplainResp = await client.ilm.explainLifecycle({ index: oldIndex });
  const expectedAction = 'rollover';
  const expectedStep = 'check-rollover-ready';
  let actionAndStep = getActionAndStep({ ilmExplain: ilmExplainResp.indices[oldIndex] });

  while (actionAndStep.action !== expectedAction || actionAndStep.step !== expectedStep) {
    log.info(
      `Index not ready after rollover: index: ${oldIndex}, action: ${actionAndStep.action}, step: ${actionAndStep.step}`
    );
    await new Promise((r) => setTimeout(r, 1000));
    const nextIlmExplainResp = await client.ilm.explainLifecycle({ index: oldIndex });
    actionAndStep = getActionAndStep({ ilmExplain: nextIlmExplainResp.indices[oldIndex] });
  }

  await client.ilm.moveToStep({
    index: rolloverResp.old_index,
    current_step: { phase: 'hot', action: expectedAction, name: expectedStep },
    next_step: { phase: 'frozen' } as IlmMoveToStepStepKey, // Client types require action and name for next_step but ES doesn't actually need them.
  });
};
