/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowMigrationSource } from '../../../types';
import { WORKFLOW_UPLOAD_COMPONENTS } from '.';
import { TinesDataInputStepId } from './tines';

describe('WORKFLOW_UPLOAD_COMPONENTS', () => {
  it('maps every workflow migration source to upload steps', () => {
    expect(Object.keys(WORKFLOW_UPLOAD_COMPONENTS).sort()).toEqual(
      Object.values(WorkflowMigrationSource).sort()
    );
  });

  it('wires Tines to the Tines upload step', () => {
    const tinesSteps = WORKFLOW_UPLOAD_COMPONENTS[WorkflowMigrationSource.TINES];

    expect(tinesSteps).toHaveLength(1);
    expect(tinesSteps[0].id).toBe(TinesDataInputStepId.Upload);
    expect(tinesSteps[0].Component).toBeDefined();
  });
});
