/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React from 'react';

import { useWorkflowEditorLink } from '../../../../use_workflow_editor_link';
import { VIEW_EXAMPLE } from '../../../workflow_configuration/translations';
import { RUN_FROM_WORKFLOW_DESCRIPTION } from '../translations';

/**
 * The alias used by `useWorkflowEditorLink` to resolve the run example workflow,
 * surfaced as a "View example" link so users can discover the otherwise-hidden
 * system workflow.
 */
const RUN_EXAMPLE_ALIAS = 'attack-discovery-run-example';

const RunExampleLinkComponent: React.FC = () => {
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: RUN_EXAMPLE_ALIAS,
    workflowRunId: null,
  });

  if (editorUrl == null) {
    return null;
  }

  return (
    <EuiText color="subdued" data-test-subj="runExampleDescription" size="xs">
      {RUN_FROM_WORKFLOW_DESCRIPTION}{' '}
      <EuiLink data-test-subj="viewRunExampleWorkflow" external href={editorUrl} target="_blank">
        {VIEW_EXAMPLE}
      </EuiLink>
    </EuiText>
  );
};

RunExampleLinkComponent.displayName = 'RunExampleLink';

export const RunExampleLink = React.memo(RunExampleLinkComponent);
