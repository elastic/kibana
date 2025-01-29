/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { EntityTable } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { BasicEntityData, EntityTableRow } from './types';

const renderedFieldValue = 'testValue1';

const testField: EntityTableRow<BasicEntityData> = {
  label: 'testLabel',
  field: 'testField',
  getValues: (data: unknown) => [renderedFieldValue],
  renderField: (field: string) => <>{field}</>,
};

const mockProps = {
  contextID: 'testContextID',
  scopeId: 'testScopeId',
  isDraggable: false,
  data: { isLoading: false },
  entityFields: [testField],
};

describe('EntityTable', () => {
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
});
