/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { TableFieldValueCell } from './table_field_value_cell';

jest.mock('../../../flyout/shared/components/preview_link', () => ({
  PreviewLink: ({ field, value }: { field: string; value: string }) => (
    <span data-test-subj={`preview-link-${field}`}>{value}</span>
  ),
}));

jest.mock('../../../timelines/components/timeline/body/renderers/formatted_field', () => ({
  FormattedFieldValue: ({ value }: { value: string }) => (
    <span data-test-subj="formatted-field">{value}</span>
  ),
}));

jest.mock('../../../common/components/tables/helpers', () => ({
  OverflowField: ({ value }: { value: string }) => (
    <span data-test-subj="overflow-field">{value}</span>
  ),
}));

jest.mock('../../../flyout/document_details/right/utils/get_field_format', () => ({
  getFieldFormat: () => ({}),
}));

const mockIsFlyoutLink = jest.fn();
jest.mock('../../../flyout/shared/utils/link_utils', () => ({
  isFlyoutLink: (args: unknown) => mockIsFlyoutLink(args),
}));

const ipData = {
  field: 'host.ip',
  type: 'ip',
  isObjectArray: false,
} as unknown as EventFieldsData;

const ipFieldSpec = { aggregatable: true, name: 'host.ip', type: 'ip' } as FieldSpec;

const renderCell = (props?: Partial<React.ComponentProps<typeof TableFieldValueCell>>) =>
  render(
    <IntlProvider locale="en">
      <TableFieldValueCell field="host.ip" values={['127.0.0.1', '10.0.0.1']} {...props} />
    </IntlProvider>
  );

describe('<TableFieldValueCell /> (shared)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFlyoutLink.mockReturnValue(false);
  });

  it('renders nothing when values is null', () => {
    const { container } = renderCell({ values: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('lays out each value on its own line', () => {
    const { getByTestId } = renderCell();
    expect(getByTestId('event-field-host.ip').className).toContain('column');
  });

  describe('v1 mode', () => {
    it('renders plain text when no browser-field metadata is available', () => {
      const { getByText, queryByTestId } = renderCell({ data: ipData });
      expect(getByText('127.0.0.1')).toBeInTheDocument();
      expect(getByText('10.0.0.1')).toBeInTheDocument();
      expect(queryByTestId('formatted-field')).not.toBeInTheDocument();
      expect(queryByTestId('preview-link-host.ip')).not.toBeInTheDocument();
    });

    it('renders PreviewLink per value for flyout-link fields', () => {
      mockIsFlyoutLink.mockReturnValue(true);
      const { getAllByTestId } = renderCell({ data: ipData, fieldFromBrowserField: ipFieldSpec });
      expect(getAllByTestId('preview-link-host.ip')).toHaveLength(2);
    });

    it('renders FormattedFieldValue for non-link fields with metadata', () => {
      mockIsFlyoutLink.mockReturnValue(false);
      const { getAllByTestId, queryByTestId } = renderCell({
        data: ipData,
        fieldFromBrowserField: ipFieldSpec,
      });
      expect(getAllByTestId('formatted-field')).toHaveLength(2);
      expect(queryByTestId('preview-link-host.ip')).not.toBeInTheDocument();
    });

    it('renders the message field with the overflow renderer', () => {
      const messageData = {
        field: 'message',
        type: 'string',
        isObjectArray: false,
      } as EventFieldsData;
      const { getByTestId } = renderCell({
        field: 'message',
        values: ['some message'],
        data: messageData,
        fieldFromBrowserField: { name: 'message', type: 'string' } as FieldSpec,
      });
      expect(getByTestId('overflow-field')).toHaveTextContent('some message');
    });
  });

  describe('v2 mode', () => {
    it('wraps each value with the provided flyout-link renderer', () => {
      const renderFlyoutLink = jest.fn(
        ({
          field,
          value,
          children,
        }: {
          field: string;
          value: string;
          children?: React.ReactNode;
        }) => (
          <span data-test-subj={`flyout-link-${field}`} data-value={value}>
            {children}
          </span>
        )
      );
      const { getAllByTestId } = renderCell({ renderFlyoutLink });
      const links = getAllByTestId('flyout-link-host.ip');
      expect(links).toHaveLength(2);
      expect(links.map((l) => l.getAttribute('data-value'))).toEqual(['127.0.0.1', '10.0.0.1']);
      // v2 mode must not fall into the v1 formatting/preview branches.
      expect(renderFlyoutLink).toHaveBeenCalledTimes(2);
    });
  });
});
