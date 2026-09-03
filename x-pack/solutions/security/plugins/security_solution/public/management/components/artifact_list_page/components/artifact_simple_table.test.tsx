/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { Pagination } from '@elastic/eui';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import { ExceptionsListItemGenerator } from '../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { artifactListPageLabels } from '../translations';
import { ArtifactSimpleTable, type ArtifactSimpleTableProps } from './artifact_simple_table';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../common/endpoint/service/artifacts';
import { buildPerPolicyTag } from '../../../../../common/endpoint/service/artifacts/utils';
import type { MenuItemPropsByPolicyId } from '../../artifact_entry_card';
import { useArtifactAssignedPolicies as _useArtifactAssignedPolicies } from '../hooks/use_artifact_assigned_policies';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../hooks/use_artifact_assigned_policies');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;
const useArtifactAssignedPoliciesMock = _useArtifactAssignedPolicies as jest.Mock;

describe('ArtifactSimpleTable', () => {
  const generator = new ExceptionsListItemGenerator('seed');

  let render: (
    props?: Partial<ArtifactSimpleTableProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onChange: jest.MockedFunction<ArtifactSimpleTableProps['onChange']>;
  let onAction: jest.MockedFunction<ArtifactSimpleTableProps['onAction']>;
  let item: ExceptionListItemSchema;
  let defaultProps: ArtifactSimpleTableProps;

  const pagination: Pagination = {
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 1,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
  };

  beforeEach(() => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });
    useArtifactAssignedPoliciesMock.mockReturnValue({
      policies: {},
      isLoading: false,
    });

    const mockedContext = createAppRootMockRenderer();
    onChange = jest.fn();
    onAction = jest.fn();
    item = generator.generate({
      name: 'YARA rule one',
      os_types: ['windows', 'linux', 'macos'],
      updated_by: 'elastic',
      updated_at: '2025-12-05T12:51:33.000Z',
    });

    defaultProps = {
      items: [item],
      pagination,
      onChange,
      onAction,
      labels: artifactListPageLabels,
      'data-test-subj': 'testTable',
    };

    render = (props) => {
      renderResult = mockedContext.render(<ArtifactSimpleTable {...defaultProps} {...props} />);
      return renderResult;
    };
  });

  afterEach(() => {
    useUserPrivilegesMock.mockReset();
    useArtifactAssignedPoliciesMock.mockReset();
  });

  it('renders the expected columns', () => {
    render();

    const columns = renderResult.getAllByRole('columnheader');
    expect(columns.map((column) => column.textContent)).toEqual([
      'Name',
      'Policy assignment',
      'Operating systems',
      'Updated by',
      'Last updated',
      'Actions',
    ]);
  });

  it('renders the artifact name', () => {
    render();

    expect(renderResult.getByTestId('testTable-columnName')).toHaveTextContent('YARA rule one');
  });

  it('renders operating system badges with human-readable labels', () => {
    render();

    expect(renderResult.getByTestId('testTable-osBadge-windows')).toHaveTextContent('Windows');
    expect(renderResult.getByTestId('testTable-osBadge-linux')).toHaveTextContent('Linux');
    expect(renderResult.getByTestId('testTable-osBadge-macos')).toHaveTextContent('Mac');
  });

  it('renders the updated by avatar and name', () => {
    render();

    expect(renderResult.getByTestId('testTable-columnUpdatedByName')).toHaveTextContent('elastic');
    expect(renderResult.getByTestId('testTable-columnUpdatedByAvatar')).toBeInTheDocument();
  });

  it('renders the last updated date in the Kibana date format', () => {
    render();

    expect(renderResult.getByTestId('testTable-columnUpdatedAt')).toHaveTextContent(
      /Dec 5, 2025 @ 12:51:33/
    );
  });

  it('shows a loading state', () => {
    render({ loading: true });

    expect(renderResult.getByTestId('testTable')).toHaveClass('euiBasicTable-loading');
  });

  it('shows an error message', () => {
    render({ error: 'Failed to load artifacts' });

    expect(renderResult.getByText('Failed to load artifacts')).toBeInTheDocument();
  });

  it('shows the empty message when there are no items', () => {
    render({ items: [], pagination: { ...pagination, totalItemCount: 0 } });

    expect(renderResult.getByTestId('testTable-noResults')).toHaveTextContent('No items found');
  });

  it('opens the row actions menu with edit and delete', async () => {
    render();

    fireEvent.click(renderResult.getByTestId('testTable-rowActions-button'));

    expect(renderResult.getByTestId('testTable-cardEditAction')).toHaveTextContent('Edit artifact');
    expect(renderResult.getByTestId('testTable-cardDeleteAction')).toHaveTextContent(
      'Delete artifact'
    );
  });

  it('invokes onAction when edit is clicked', () => {
    render();

    fireEvent.click(renderResult.getByTestId('testTable-rowActions-button'));
    fireEvent.click(renderResult.getByTestId('testTable-cardEditAction'));

    expect(onAction).toHaveBeenCalledWith({ type: 'edit', item });
  });

  it('invokes onAction when delete is clicked', () => {
    render();

    fireEvent.click(renderResult.getByTestId('testTable-rowActions-button'));
    fireEvent.click(renderResult.getByTestId('testTable-cardDeleteAction'));

    expect(onAction).toHaveBeenCalledWith({ type: 'delete', item });
  });

  it('hides the edit action when it is not allowed', () => {
    render({ allowCardEditAction: false });

    fireEvent.click(renderResult.getByTestId('testTable-rowActions-button'));

    expect(renderResult.queryByTestId('testTable-cardEditAction')).not.toBeInTheDocument();
    expect(renderResult.getByTestId('testTable-cardDeleteAction')).toBeInTheDocument();
  });

  it('hides the actions column when neither edit nor delete is allowed', () => {
    render({ allowCardEditAction: false, allowCardDeleteAction: false });

    const columns = renderResult.getAllByRole('columnheader');
    expect(columns.map((column) => column.textContent)).toEqual([
      'Name',
      'Policy assignment',
      'Operating systems',
      'Updated by',
      'Last updated',
    ]);
  });

  it('invokes onChange when pagination changes', () => {
    render({
      pagination: { ...pagination, totalItemCount: 20 },
    });

    fireEvent.click(renderResult.getByTestId('pagination-button-next'));

    expect(onChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
  });

  it('invokes onChange with sort when a sortable column header is clicked', () => {
    render();

    fireEvent.click(renderResult.getByText('Name'));

    expect(onChange).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 10,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });

  it('marks the active sort column', () => {
    render({ sortField: 'updated_at', sortOrder: 'desc' });

    expect(renderResult.getByText('Last updated').closest('th')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  describe('policy assignment column', () => {
    it('renders Global when the artifact has the global tag', () => {
      render({
        items: [generator.generate({ ...item, tags: [GLOBAL_ARTIFACT_TAG] })],
      });

      expect(renderResult.getByTestId('testTable-columnPolicyAssignment-global')).toHaveTextContent(
        'Global'
      );
    });

    it('renders None when the artifact is not assigned to any policy', () => {
      render({
        items: [generator.generate({ ...item, tags: [] })],
      });

      expect(renderResult.getByTestId('testTable-columnPolicyAssignment-none')).toHaveTextContent(
        'None'
      );
    });

    it('renders the first policy as a link when the user can read policies', () => {
      const policies: MenuItemPropsByPolicyId = {
        'policy-1': {
          children: 'Policy one',
          href: 'http://example/policy-1',
          target: '_blank',
          'data-test-subj': 'policyMenuItem-1',
        },
      };
      useArtifactAssignedPoliciesMock.mockReturnValue({
        policies,
        isLoading: false,
      });

      render({
        items: [generator.generate({ ...item, tags: [buildPerPolicyTag('policy-1')] })],
      });

      const firstPolicy = renderResult.getByTestId('testTable-columnPolicyAssignment-firstPolicy');
      expect(firstPolicy).toHaveTextContent('Policy one');
      expect(firstPolicy).toHaveAttribute('href', 'http://example/policy-1');
      expect(
        renderResult.queryByTestId('testTable-columnPolicyAssignment-additionalCount')
      ).not.toBeInTheDocument();
    });

    it('renders the first policy as text when the user cannot read policies', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: getEndpointAuthzInitialStateMock({ canReadPolicyManagement: false }),
      });
      useArtifactAssignedPoliciesMock.mockReturnValue({
        policies: {
          'policy-1': {
            children: 'Policy one',
            href: 'http://example/policy-1',
            target: '_blank',
          },
        },
        isLoading: false,
      });

      render({
        items: [generator.generate({ ...item, tags: [buildPerPolicyTag('policy-1')] })],
      });

      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-firstPolicy')
      ).toHaveTextContent('Policy one');
      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-firstPolicy')
      ).not.toHaveAttribute('href');
    });

    it('renders the first policy name and a count badge when assigned to multiple policies', () => {
      const policies: MenuItemPropsByPolicyId = {
        'policy-1': {
          children: 'Policy one',
          href: 'http://example/policy-1',
          'data-test-subj': 'policyMenuItem-1',
        },
        'policy-2': {
          children: 'Policy two',
          href: 'http://example/policy-2',
          'data-test-subj': 'policyMenuItem-2',
        },
        'policy-3': {
          children: 'Policy three',
          href: 'http://example/policy-3',
          'data-test-subj': 'policyMenuItem-3',
        },
      };
      useArtifactAssignedPoliciesMock.mockReturnValue({
        policies,
        isLoading: false,
      });

      render({
        items: [
          generator.generate({
            ...item,
            tags: [
              buildPerPolicyTag('policy-1'),
              buildPerPolicyTag('policy-2'),
              buildPerPolicyTag('policy-3'),
            ],
          }),
        ],
      });

      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-firstPolicy')
      ).toHaveTextContent('Policy one');
      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-additionalCount')
      ).toHaveTextContent('+2');
    });

    it('opens the policies popup listing only the additional policies when the count badge is clicked', async () => {
      const policies: MenuItemPropsByPolicyId = {
        'policy-1': {
          children: 'Policy one',
          href: 'http://example/policy-1',
          'data-test-subj': 'policyMenuItem-1',
        },
        'policy-2': {
          children: 'Policy two',
          href: 'http://example/policy-2',
          'data-test-subj': 'policyMenuItem-2',
        },
      };
      useArtifactAssignedPoliciesMock.mockReturnValue({
        policies,
        isLoading: false,
      });

      render({
        items: [
          generator.generate({
            ...item,
            tags: [buildPerPolicyTag('policy-1'), buildPerPolicyTag('policy-2')],
          }),
        ],
      });

      fireEvent.click(renderResult.getByTestId('testTable-columnPolicyAssignment-additionalCount'));

      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-popupMenu-popoverPanel')
      ).toBeInTheDocument();
      expect(renderResult.queryByTestId('policyMenuItem-1')).not.toBeInTheDocument();
      expect(renderResult.getByTestId('policyMenuItem-2')).toHaveTextContent(
        'Policy twoView details'
      );
    });

    it('shows the policy id when the policy is not in the policies map', () => {
      render({
        items: [generator.generate({ ...item, tags: [buildPerPolicyTag('policy-unknown')] })],
      });

      expect(
        renderResult.getByTestId('testTable-columnPolicyAssignment-firstPolicy')
      ).toHaveTextContent('policy-unknown');
    });
  });
});
