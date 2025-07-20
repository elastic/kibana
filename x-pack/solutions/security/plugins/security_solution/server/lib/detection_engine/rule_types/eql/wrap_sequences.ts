/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlSequence } from '../../../../../common/detection_engine/types';
import type { SecuritySharedParams, SignalSource } from '../types';
import { buildAlertGroupFromSequence } from './build_alert_group_from_sequence';
import type { EqlRuleParams } from '../../rule_schema';
import type {
  EqlBuildingBlockAlertLatest,
  EqlShellAlertLatest,
  WrappedAlert,
} from '../../../../../common/api/detection_engine/model/alerts';
import type { BuildReasonMessage } from '../utils/reason_formatters';

export const wrapSequences = ({
  sharedParams,
  sequences,
  buildReasonMessage,
}: {
  sharedParams: SecuritySharedParams<EqlRuleParams>;
  sequences: Array<EqlSequence<SignalSource>>;
  buildReasonMessage: BuildReasonMessage;
}) =>
  sequences.reduce<
    Array<WrappedAlert<EqlShellAlertLatest> | WrappedAlert<EqlBuildingBlockAlertLatest>>
  >((acc, sequence) => {
    const { shellAlert, buildingBlocks } = buildAlertGroupFromSequence({
      sharedParams,
      sequence,
      buildReasonMessage,
    });
    if (shellAlert) {
      acc.push(shellAlert, ...buildingBlocks);
      return acc;
    }
    return acc;
  }, []);
