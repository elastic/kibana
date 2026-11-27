/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  triageGroupFpCandidatesStepCommonDefinition,
  triageHeadroomStepCommonDefinition,
  triageJoinProposalStepCommonDefinition,
  triageLoadAlertsStepCommonDefinition,
  triagePlanSweepStepCommonDefinition,
  triageRetagProposalAlertsStepCommonDefinition,
  triageTagPatternKeysStepCommonDefinition,
} from '../../common/step_types/alert_triage';
import { AlertZeroStepIcon } from './alertzero_step_icon';

export const triageHeadroomPublicStepDefinition = createPublicStepDefinition({
  ...triageHeadroomStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triagePlanSweepPublicStepDefinition = createPublicStepDefinition({
  ...triagePlanSweepStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triageLoadAlertsPublicStepDefinition = createPublicStepDefinition({
  ...triageLoadAlertsStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triageTagPatternKeysPublicStepDefinition = createPublicStepDefinition({
  ...triageTagPatternKeysStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triageGroupFpCandidatesPublicStepDefinition = createPublicStepDefinition({
  ...triageGroupFpCandidatesStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triageJoinProposalPublicStepDefinition = createPublicStepDefinition({
  ...triageJoinProposalStepCommonDefinition,
  icon: AlertZeroStepIcon,
});

export const triageRetagProposalAlertsPublicStepDefinition = createPublicStepDefinition({
  ...triageRetagProposalAlertsStepCommonDefinition,
  icon: AlertZeroStepIcon,
});
