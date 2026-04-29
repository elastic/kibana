/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { BasicEntityData, EntityTableRow } from './types';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from '../../../../shared/components/test_ids';
import { mockFlyoutApi } from '../../../../document_details/shared/mocks/mock_flyout_context';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

const renderedFieldValue = 'testValue1';

const testField: EntityTableRow<BasicEntityData> = {
  label: 'testLabel',
  field: 'testField',
  getValues: (data: unknown) => [renderedFieldValue],
  renderField: (field: string) => <>{field}</>,
};

const testFieldWithPreview: EntityTableRow<BasicEntityData> = {
  label: 'testIP',
  field: 'host.ip',
  getValues: (data: unknown) => [renderedFieldValue],
  renderField: (field: string) => <>{field}</>,
};

const mockProps = {
  contextID: 'testContextID',
  scopeId: 'testScopeId',
  data: { isLoading: false },
  entityFields: [testField],
};

describe('EntityTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('renders correctly', () => {
    const { queryByTestId, queryAllByTestId } = render(<EntityTable {...mockProps} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('entity-table')).toBeInTheDocument();
    expect(queryAllByTestId('entity-table-label')).toHaveLength(1);
  });

  it("it doesn't render fields when isVisible returns false", () => {
    const props = {
      ...mockProps,
      entityFields: [
        {
          ...testField,
          isVisible: () => false,
        },
      ],
    };

    const { queryAllByTestId } = render(<EntityTable {...props} />, {
      wrapper: TestProviders,
    });

    expect(queryAllByTestId('entity-table-label')).toHaveLength(0);
  });

  it('it renders the field label', () => {
    const { queryByTestId } = render(<EntityTable {...mockProps} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('entity-table-label')).toHaveTextContent('testLabel');
  });

  it('it renders the field value', () => {
    const { queryByTestId } = render(<EntityTable {...mockProps} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('DefaultFieldRendererComponent')).toHaveTextContent(renderedFieldValue);
  });

  it('it call render function when field is undefined', () => {
    const props = {
      ...mockProps,
      entityFields: [
        {
          label: 'testLabel',
          render: (data: unknown) => (
            <span data-test-subj="test-custom-render">{'test-custom-render'}</span>
          ),
        },
      ],
    };

    const { queryByTestId } = render(<EntityTable {...props} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('test-custom-render')).toBeInTheDocument();
  });

  it('it renders link to open in preview if the field has a preview link', () => {
    const props = {
      ...mockProps,
      entityFields: [testFieldWithPreview],
    };

    const { getByTestId } = render(<EntityTable {...props} />, { wrapper: TestProviders });

    expect(getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).toBeInTheDocument();
    getByTestId(FLYOUT_PREVIEW_LINK_TEST_ID).click();
    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalled();
  });
});
