/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { WORKFLOW_LOCALSTORAGE_KEY, WorkflowId } from '@kbn/search-shared-ui';
import {
  DenseVectorIngestDataCodeExamples,
  SemanticIngestDataCodeExamples,
  DefaultIngestDataCodeExamples,
} from '../../../code_examples/ingest_data';
import { workflows } from '../../../code_examples/workflows';
import {
  DefaultCodeExamples,
  DenseVectorCodeExamples,
  SemanticCodeExamples,
} from '../../../code_examples/create_index';
import { useOnboardingTokenQuery } from '../../../hooks/api/use_onboarding_data';

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

function isWorkflowId(value: string | null): value is WorkflowId {
  return value === 'default' || value === 'vector' || value === 'semantic';
}

// possible onboarding tokens now: 'general' | 'vector' | 'timeseries' | 'semantic' for serverless, 'vectorsearch' or 'search' for hosted
// note: test with http://localhost:5601/app/cloud/onboarding?next=/app/elasticsearc/starth&onboarding_token=vector in Serverless
// http://localhost:5601/app/cloud/onboarding?next=/app/elasticsearch/start&onboarding_token=vector in Hosted

function onboardingTokenToWorkflowId(token: string | undefined | null): WorkflowId {
  switch (token) {
    case 'vector':
      return 'vector';
    case 'vectorsearch':
      return 'vector';
    case 'semantic':
      return 'semantic';
    default:
      return 'default';
  }
}

const DEFAULT_WORKFLOW_ID: WorkflowId = 'semantic';

export const useWorkflow = () => {
  const localStorageWorkflow = localStorage.getItem(WORKFLOW_LOCALSTORAGE_KEY);
  const workflowId = isWorkflowId(localStorageWorkflow) ? localStorageWorkflow : null;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<WorkflowId>(
    workflowId || DEFAULT_WORKFLOW_ID
  );
  const { data } = useOnboardingTokenQuery();

  useEffect(() => {
    if (data?.token && !localStorageWorkflow) {
      setSelectedWorkflowId(onboardingTokenToWorkflowId(data.token));
    }
  }, [data, localStorageWorkflow]);
  return {
    selectedWorkflowId,
    setSelectedWorkflowId: (newWorkflowId: WorkflowId) => {
      localStorage.setItem(WORKFLOW_LOCALSTORAGE_KEY, newWorkflowId);
      setSelectedWorkflowId(newWorkflowId);
    },
    workflow: workflows.find((workflow) => workflow.id === selectedWorkflowId),
    createIndexExamples: workflowIdToCreateIndexExamples(selectedWorkflowId),
    ingestExamples: workflowIdToIngestDataExamples(selectedWorkflowId),
  };
};
