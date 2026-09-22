/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { SecurityWorkflowInsight } from '../../../../../../../../../common/endpoint/types/workflow_insights';
import { WorkflowInsightsPolicyResponseFailureResult } from './policy_response_failure';

const baseInsight = (link?: string): SecurityWorkflowInsight =>
  ({
    value: 'Policy response failure detected',
    remediation: {
      descriptive: 'Reapply the endpoint policy.',
      link,
    },
    metadata: {
      display_name: 'Failed to configure malware protection',
    },
  } as unknown as SecurityWorkflowInsight);

const getRemediationButton = () => screen.getByTestId('workflowInsightsResult-0-remediation');

describe('WorkflowInsightsPolicyResponseFailureResult remediation link', () => {
  it('renders a visible external link when the persisted link is a valid Elastic docs URL', () => {
    render(
      <WorkflowInsightsPolicyResponseFailureResult
        insight={baseInsight('https://www.elastic.co/docs/solutions/security')}
        index={0}
      />
    );

    const button = getRemediationButton();
    expect(button).toHaveAttribute('href', 'https://www.elastic.co/docs/solutions/security');
    expect(button).toHaveStyle({ visibility: 'visible' });
  });

  it('hides the button for a legacy in-app / fabricated persisted link', () => {
    render(
      <WorkflowInsightsPolicyResponseFailureResult
        insight={baseInsight('/app/security/administration/UNKNOWN')}
        index={0}
      />
    );

    const button = getRemediationButton();
    expect(button).not.toHaveAttribute('href');
    expect(button).toHaveStyle({ visibility: 'hidden' });
  });

  it('hides the button when no link is persisted', () => {
    render(<WorkflowInsightsPolicyResponseFailureResult insight={baseInsight()} index={0} />);

    const button = getRemediationButton();
    expect(button).not.toHaveAttribute('href');
    expect(button).toHaveStyle({ visibility: 'hidden' });
  });
});
