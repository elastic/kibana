/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { coalesceFpCloseProposalStepDefinition } from './coalesce_fp_close_proposal';
import { findOpenFpCloseProposalStepDefinition } from './find_open_fp_close_proposal';
import type { FpCloseStepDependencies } from './fp_close_proposal';
import { releaseFpOpenPointerStepDefinition } from './release_fp_open_pointer';

/** Registers the AlertZero workflow steps the managed Alert Triage workflows call. */
export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  dependencies: FpCloseStepDependencies
): void => {
  workflowsExtensions.registerStepDefinition(findOpenFpCloseProposalStepDefinition(dependencies));
  workflowsExtensions.registerStepDefinition(coalesceFpCloseProposalStepDefinition(dependencies));
  workflowsExtensions.registerStepDefinition(releaseFpOpenPointerStepDefinition(dependencies));
};
