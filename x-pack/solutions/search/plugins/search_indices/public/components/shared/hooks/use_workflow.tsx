/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import {
  DenseVectorIngestDataCodeExamples,
  SemanticIngestDataCodeExamples,
  DefaultIngestDataCodeExamples,
} from '../../../code_examples/ingest_data';
import { WorkflowId, workflows } from '../../../code_examples/workflows';
import {
  DefaultCodeExamples,
  DenseVectorCodeExamples,
  SemanticCodeExamples,
} from '../../../code_examples/create_index';

const workflowIdToCreateIndexExamples = (type: WorkflowId) => {
  switch (type) {
    case 'vector':
      return DenseVectorCodeExamples;
    case 'semantic':
      return SemanticCodeExamples;
    default:
      return DefaultCodeExamples;
  }
};

const workflowIdToIngestDataExamples = (type: WorkflowId) => {
  switch (type) {
    case 'vector':
      return DenseVectorIngestDataCodeExamples;
    case 'semantic':
      return SemanticIngestDataCodeExamples;
    default:
      return DefaultIngestDataCodeExamples;
  }
};

export const useWorkflow = () => {
  // TODO: in the future this will be dynamic based on the onboarding token
  // or project sub-type
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<WorkflowId>('default');
  return {
    selectedWorkflowId,
    setSelectedWorkflowId,
    workflow: workflows.find((workflow) => workflow.id === selectedWorkflowId),
    createIndexExamples: workflowIdToCreateIndexExamples(selectedWorkflowId),
    ingestExamples: workflowIdToIngestDataExamples(selectedWorkflowId),
  };
};
