/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { RelatedEntityCard } from './related_entity_card';
import { AI_AGENT_TEST_IDS } from '../test_ids';

const TEST_ID = 'relatedEntityCard';

describe('RelatedEntityCard', () => {
  it('shows the caption, the name and the subtitle', () => {
    render(
      <TestProviders>
        <RelatedEntityCard
          caption="Signed in as"
          iconType="user"
          name="Avery Quinn"
          subtitle="avery.quinn@example.com"
          data-test-subj={TEST_ID}
        />
      </TestProviders>
    );
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(
      'Signed in asAvery Quinnavery.quinn@example.com'
    );
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.entityStatus)).not.toBeInTheDocument();
  });

  it('labels every value', () => {
    render(
      <TestProviders>
        <RelatedEntityCard
          caption="Host"
          iconType="storage"
          name="ci-build-01"
          items={[
            { title: 'Asset criticality', description: 'High Impact' },
            { title: 'Host risk level', description: 'High' },
          ]}
          data-test-subj={TEST_ID}
        />
      </TestProviders>
    );
    expect(screen.getByText('Asset criticality')).toBeInTheDocument();
    expect(screen.getByText('High Impact')).toBeInTheDocument();
    expect(screen.getByText('Host risk level')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('joins the status facts into one line after a single icon', () => {
    render(
      <TestProviders>
        <RelatedEntityCard
          caption="Signed in as"
          iconType="user"
          name="Avery Quinn"
          status={['Terminated Nov 25, 2026', 'Okta deprovisioned', 'MFA off']}
        />
      </TestProviders>
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.entityStatus)).toHaveTextContent(
      'Terminated Nov 25, 2026 · Okta deprovisioned · MFA off'
    );
  });

  it('renders extra rows such as an alert bar', () => {
    render(
      <TestProviders>
        <RelatedEntityCard caption="Host" iconType="storage" name="ci-build-01">
          <EuiFlexItem data-test-subj="extraRow">{'Alerts'}</EuiFlexItem>
        </RelatedEntityCard>
      </TestProviders>
    );
    expect(screen.getByTestId('extraRow')).toBeInTheDocument();
  });
});
