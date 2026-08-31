/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import type { MissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import { TestProviders } from '../../../common/mock';
import { WorkflowsMissingPrivilegesCallOut } from '.';

const workflowsMissingPrivileges: MissingPrivileges = {
  featurePrivileges: [['workflowsManagement', ['read', 'execute']]],
  indexPrivileges: [],
};

describe('WorkflowsMissingPrivilegesCallOut', () => {
  it('renders the callout title', () => {
    const { getByText } = render(
      <TestProviders>
        <WorkflowsMissingPrivilegesCallOut missingPrivileges={workflowsMissingPrivileges} />
      </TestProviders>
    );

    expect(getByText('Insufficient privileges')).toBeInTheDocument();
  });

  it('renders the read explanation when the read privilege is missing', () => {
    const { container } = render(
      <TestProviders>
        <WorkflowsMissingPrivilegesCallOut missingPrivileges={workflowsMissingPrivileges} />
      </TestProviders>
    );

    expect(container.textContent).toContain(
      'Without this privilege, you cannot monitor Attack discovery generations.'
    );
  });

  it('renders the execute explanation when the execute privilege is missing', () => {
    const { container } = render(
      <TestProviders>
        <WorkflowsMissingPrivilegesCallOut missingPrivileges={workflowsMissingPrivileges} />
      </TestProviders>
    );

    expect(container.textContent).toContain(
      'Without this privilege, you cannot generate Attack discoveries or manage Attack discovery schedules.'
    );
  });

  it('does not render a dismiss button', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <WorkflowsMissingPrivilegesCallOut missingPrivileges={workflowsMissingPrivileges} />
      </TestProviders>
    );

    expect(queryByTestId('callout-dismiss-btn')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no missing privileges', () => {
    const { container } = render(
      <TestProviders>
        <WorkflowsMissingPrivilegesCallOut
          missingPrivileges={{ featurePrivileges: [], indexPrivileges: [] }}
        />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
