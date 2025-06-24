/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { ManagedUserAccordion } from './managed_user_accordion';
import { mockEntraUserFields } from '../mocks';
import { UserAssetTableType } from '../../../../explore/users/store/model';

describe('ManagedUserAccordion', () => {
  it('it renders children', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ManagedUserAccordion
          title="test title"
          managedUser={mockEntraUserFields}
          tableType={UserAssetTableType.assetEntra}
          openDetailsPanel={() => {}}
          isLinkEnabled
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(getByTestId('test-children')).toBeInTheDocument();
    expect(getByTestId('managed-user-accordion-userAssetEntraTitleLink')).toBeInTheDocument();
    expect(getByTestId('managed-user-accordion-userAssetEntraTitleIcon')).toBeInTheDocument();
  });

  it('renders link without icon when in preview mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <ManagedUserAccordion
          title="test title"
          managedUser={mockEntraUserFields}
          tableType={UserAssetTableType.assetEntra}
          openDetailsPanel={() => {}}
          isLinkEnabled
          isPreviewMode
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(getByTestId('managed-user-accordion-userAssetEntraTitleLink')).toBeInTheDocument();
    expect(queryByTestId('managed-user-accordion-userAssetEntraTitleIcon')).not.toBeInTheDocument();
  });

  it('does not render link when link is not enabled', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ManagedUserAccordion
          title="test title"
          managedUser={mockEntraUserFields}
          tableType={UserAssetTableType.assetEntra}
          openDetailsPanel={() => {}}
          isLinkEnabled={false}
        >
          <div data-test-subj="test-children" />
        </ManagedUserAccordion>
      </TestProviders>
    );

    expect(queryByTestId('managed-user-accordion-userAssetEntraTitleLink')).not.toBeInTheDocument();
  });
});
