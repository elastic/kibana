/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntraInsights } from '.';
import { ENTRA_INSIGHTS_TOOL_TEST_ID } from './test_ids';
import type { ManagedUserHit } from '../../../../../../common/search_strategy/security_solution/users/managed_details';

jest.mock('../../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({
    title,
    label,
    iconType,
    onTitleClick,
  }: {
    title: string;
    label?: string;
    iconType?: string;
    onTitleClick?: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="mockToolsFlyoutHeader"
      data-title={title}
      data-label={label}
      data-icon-type={iconType}
      onClick={onTitleClick}
    />
  ),
}));

jest.mock('../../../../../flyout/entity_details/user_details_left/tabs/asset_document', () => ({
  AssetDocumentTab: () => <div data-test-subj="mockAssetDocumentTab" />,
}));

jest.mock('../../../../../flyout/document_details/shared/context', () => ({
  DocumentDetailsProvider: ({
    id,
    indexName,
    scopeId,
    children,
  }: {
    id: string;
    indexName: string;
    scopeId: string;
    children: React.ReactNode;
  }) => (
    <div
      data-test-subj="mockDocumentDetailsProvider"
      data-id={id}
      data-index-name={indexName}
      data-scope-id={scopeId}
    >
      {children}
    </div>
  ),
}));

const mockManagedUserHit: ManagedUserHit = {
  _id: 'entra-doc-id',
  _index: 'entra-index',
  fields: {},
};

describe('<EntraInsights />', () => {
  it('renders the header with the "Entra Data" title, user label and user icon', () => {
    const { getByTestId } = render(
      <EntraInsights managedUser={mockManagedUserHit} value="my-user" />
    );
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-title', 'Entra Data');
    expect(header).toHaveAttribute('data-label', 'my-user');
    expect(header).toHaveAttribute('data-icon-type', 'user');
  });

  it('renders the entra insights body container', () => {
    const { getByTestId } = render(
      <EntraInsights managedUser={mockManagedUserHit} value="my-user" />
    );
    expect(getByTestId(ENTRA_INSIGHTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes the managed user document id and index to DocumentDetailsProvider', () => {
    const { getByTestId } = render(
      <EntraInsights managedUser={mockManagedUserHit} value="my-user" />
    );
    const provider = getByTestId('mockDocumentDetailsProvider');
    expect(provider).toHaveAttribute('data-id', 'entra-doc-id');
    expect(provider).toHaveAttribute('data-index-name', 'entra-index');
  });

  it('forwards onOpenUser to the header click handler', () => {
    const onOpenUser = jest.fn();
    const { getByTestId } = render(
      <EntraInsights managedUser={mockManagedUserHit} value="my-user" onOpenUser={onOpenUser} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onOpenUser).toHaveBeenCalledTimes(1);
  });
});
