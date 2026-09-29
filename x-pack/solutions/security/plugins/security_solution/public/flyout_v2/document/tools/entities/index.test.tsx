/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EntityDetails } from '.';
import { mockContextValue } from '../../../../flyout/document_details/shared/mocks/mock_context';
import { ENTITIES_TOOL_TEST_ID } from './test_ids';

vi.mock('../../../../flyout/document_details/left/components/entities_details', () => {
      const mocked = {
      EntitiesDetails: () => <div data-test-subj="mockEntitiesDetails" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../flyout/document_details/shared/context', () => {
  const { createContext } = require('react');
  return {
    DocumentDetailsContext: createContext(undefined),
  };
});
vi.mock('../../../../flyout/document_details/shared/hooks/use_get_fields_data', () => {
      const mocked = {
      useGetFieldsData: () => ({ getFieldsData: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../shared/components/tools_flyout_header', () => {
      const mocked = {
      ToolsFlyoutHeader: ({ title }: { title: string }) => (
        <div data-test-subj="mockToolsFlyoutHeader">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../shared/hooks/use_document_flyout_title', () => {
      const mocked = {
      useDocumentFlyoutTitle: () => ({
        label: 'test label',
        iconType: 'warning',
        onTitleClick: vi.fn(),
        badge: undefined,
        timestamp: undefined,
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useStore: () => ({}),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: () => ({ push: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          overlays: { openSystemFlyout: vi.fn() },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/hooks/is_in_security_app', () => {
      const mocked = {
      useIsInSecurityApp: () => true,
    };
      return { ...mocked, default: mocked };
    });

const renderEntityDetails = ({
  hit = buildDataTableRecord(mockContextValue.searchHit as EsHitRecord),
}: {
  hit?: ReturnType<typeof buildDataTableRecord>;
} = {}) =>
  render(
    <IntlProvider locale="en">
      <EntityDetails hit={hit} />
    </IntlProvider>
  );

describe('<EntityDetails />', () => {
  it('should render the header with Entities title', () => {
    const { getByTestId } = renderEntityDetails();
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveTextContent('Entities');
  });

  it('should render the entities details inside the flyout body', () => {
    const { getByTestId } = renderEntityDetails();
    expect(getByTestId(ENTITIES_TOOL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('mockEntitiesDetails')).toBeInTheDocument();
  });
});
