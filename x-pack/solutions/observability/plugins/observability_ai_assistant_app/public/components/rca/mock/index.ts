/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigateEntityToolMessage,
  RootCauseAnalysisEvent,
} from '@kbn/observability-ai-server/root_cause_analysis';
import { RCA_INVESTIGATE_ENTITY_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { MessageRole } from '@kbn/inference-common';
import { Required } from 'utility-types';
// @ts-ignore
import completeRootCauseAnalysisJson from './complete_root_cause_analysis.json';

export const completeRootCauseAnalysis = completeRootCauseAnalysisJson as RootCauseAnalysisEvent[];

export const controllerEntityHealthAnalysis = completeRootCauseAnalysis.find(
  (event) =>
    'role' in event &&
    event.role === MessageRole.Tool &&
    event.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME &&
    event.response.entity['service.name'] === 'cartservice'
) as Required<InvestigateEntityToolMessage, 'data'>;
