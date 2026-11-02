/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EntityDetails } from '.';
import { mockContextValue } from '../../../../flyout/document_details/shared/mocks/mock_context';
import { ENTITIES_TOOL_TEST_ID } from './test_ids';

jest.mock('../../../../flyout/document_details/left/components/entities_details', () => ({
  EntitiesDetails: () => <div data-test-subj="mockEntitiesDetails" />,
}));
jest.mock('../../../../flyout/document_details/shared/context', () => {
  const { createContext } = jest.requireActual('react');
  return {
    DocumentDetailsContext: createContext(undefined),
  };
});
jest.mock('../../../../flyout/document_details/shared/hooks/use_get_fields_data', () => ({
  useGetFieldsData: () => ({ getFieldsData: jest.fn() }),
}));
jest.mock('../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({ title }: { title: string }) => (
    <div data-test-subj="mockToolsFlyoutHeader">{title}</div>
  ),
}));
jest.mock('../../../shared/hooks/use_document_flyout_title', () => ({
  useDocumentFlyoutTitle: () => ({
    label: 'test label',
    iconType: 'warning',
    onTitleClick: jest.fn(),
    badge: undefined,
    timestamp: undefined,
  }),
}));
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useStore: () => ({}),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      overlays: { openSystemFlyout: jest.fn() },
    },
  }),
}));
jest.mock('../../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: () => true,
}));

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
