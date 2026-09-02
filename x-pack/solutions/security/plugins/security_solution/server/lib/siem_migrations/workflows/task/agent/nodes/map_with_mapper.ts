/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TinesToWorkflowMapper } from '../../../../../../../common/siem_migrations/parsers/tines';
import type { GraphNode } from '../types';

/**
 * Deterministic Tines → Workflow YAML mapping via {@link TinesToWorkflowMapper}.
 */
export const getMapWithMapperNode = (): GraphNode => {
  return async (state) => {
    const result = TinesToWorkflowMapper.map(state.original_workflow.data);
    return {
      yaml: result.yaml,
      report: result.report,
      validation: result.validation,
    };
  };
};
