/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { render } from '../../../utils/testing/rtl_helpers';
import { MonitorTagsComboBox } from './monitor_tags_combo_box';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

const useFetcherMock = useFetcher as jest.Mock;

describe('<MonitorTagsComboBox />', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useFetcherMock.mockReturnValue({ data: ['prod', 'staging'], loading: false });
  });

  it('shows fetched existing tags as suggestions', () => {
    const { getByTestId, getByText } = render(
      <MonitorTagsComboBox selectedOptions={[]} onChange={onChange} enableCopy />
    );

    fireEvent.click(getByTestId('comboBoxToggleListButton'));

    expect(getByText('prod')).toBeInTheDocument();
    expect(getByText('staging')).toBeInTheDocument();
  });

  it('still allows creating a tag that is not in the suggestions', () => {
    const { getByTestId } = render(
      <MonitorTagsComboBox selectedOptions={[]} onChange={onChange} enableCopy />
    );

    const input = getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'team-a' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['team-a']);
  });
});
