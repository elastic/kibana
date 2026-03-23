/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { EventFieldsData } from '../../../common/components/event_details/types';
import { TableFieldValueCell } from './table_field_value_cell';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../timelines/components/timeline/body/renderers/formatted_field', () => ({
  FormattedFieldValue: (props: { value: string }) => (
    <span data-test-subj="formatted-field-value">{props.value}</span>
  ),
}));

jest.mock('../../document_details/right/utils/get_field_format', () => ({
  getFieldFormat: jest.fn(),
}));

const attackId = 'attack-id';

const hostIpData: EventFieldsData = {
  aggregatable: true,
  ariaRowindex: 1,
  field: 'host.ip',
  isObjectArray: false,
  name: 'host.ip',
  originalValue: ['127.0.0.1', '::1', '10.1.2.3', 'fe80::1'],
  readFromDocValues: false,
  searchable: true,
  type: 'ip',
  values: ['127.0.0.1', '::1', '10.1.2.3', 'fe80::1'],
};

const hostIpValues = ['127.0.0.1', '::1', '10.1.2.3', 'fe80::1'];

describe('TableFieldValueCell (attack)', () => {
  it('returns null when values is null', () => {
    const { container } = render(
      <TestProviders>
        <TableFieldValueCell data={hostIpData} attackId={attackId} values={null} />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  describe('when BrowserField metadata is NOT available', () => {
    it('renders only limited values initially and all values after clicking "Show more"', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders>
          <TableFieldValueCell data={hostIpData} attackId={attackId} values={hostIpValues} />
        </TestProviders>
      );

      expect(screen.getByTestId('attack-field-host.ip').className).toContain('column');

      const visibleInitially = hostIpValues.slice(0, 2);
      const hiddenInitially = hostIpValues.slice(2);

      visibleInitially.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
      hiddenInitially.forEach((value) => {
        expect(screen.queryByText(value)).not.toBeInTheDocument();
      });

      const showMoreButton = screen.getByTestId('attack-field-toggle-show-more-button');
      expect(showMoreButton).toBeInTheDocument();
      expect(showMoreButton).toHaveTextContent('Show more');

      await user.click(showMoreButton);

      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
      expect(showMoreButton).toHaveTextContent('Show less');

      await user.click(showMoreButton);

      hiddenInitially.forEach((value) => {
        expect(screen.queryByText(value)).not.toBeInTheDocument();
      });
      visibleInitially.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
      expect(showMoreButton).toHaveTextContent('Show more');
    });

    it('does not render "Show more" when values length is within the limit', () => {
      const shortValues = ['127.0.0.1', '::1'];

      render(
        <TestProviders>
          <TableFieldValueCell
            data={hostIpData}
            attackId={attackId}
            values={shortValues}
            displayValuesLimit={5}
          />
        </TestProviders>
      );

      shortValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('attack-field-toggle-show-more-button')).not.toBeInTheDocument();
    });
  });

  describe('when FieldSpec metadata IS available', () => {
    const hostIpFieldFromBrowserField: FieldSpec = {
      aggregatable: true,
      name: 'host.ip',
      readFromDocValues: false,
      searchable: true,
      type: 'ip',
    };

    it('uses FormattedFieldValue for each visible value', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders>
          <TableFieldValueCell
            data={hostIpData}
            attackId={attackId}
            fieldFromBrowserField={hostIpFieldFromBrowserField}
            values={hostIpValues}
            displayValuesLimit={2}
          />
        </TestProviders>
      );

      let formattedValues = screen.getAllByTestId('formatted-field-value');
      expect(formattedValues.length).toBe(2);
      expect(formattedValues[0]).toHaveTextContent('127.0.0.1');
      expect(formattedValues[1]).toHaveTextContent('::1');

      const showMoreButton = screen.getByTestId('attack-field-toggle-show-more-button');
      await user.click(showMoreButton);

      formattedValues = screen.getAllByTestId('formatted-field-value');
      expect(formattedValues.length).toBe(hostIpValues.length);
      hostIpValues.forEach((value) => {
        expect(screen.getByText(value)).toBeInTheDocument();
      });
    });
  });
});
