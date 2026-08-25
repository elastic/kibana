/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { IndexPatternPlaceholderFormWrapper } from './flyout';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { schema } from './schema';

const Component = ({
  index = ['mock-index'],
  onClose = () => {},
  onSubmit = () => {},
}: {
  index?: string[];
  onClose?: () => void;
  onSubmit?: () => void;
}) => {
  const defaultValue = { index };
  const { form } = useForm({ defaultValue, schema });

  return (
    <TestProviders>
      <IndexPatternPlaceholderFormWrapper
        form={form}
        title={'Test Title'}
        onClose={onClose}
        onSubmit={onSubmit}
      >
        <div />
      </IndexPatternPlaceholderFormWrapper>
    </TestProviders>
  );
};

describe('IndexPatternPlaceholderFormWrapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout with the correct title', () => {
    const { getByTestId } = render(<Component />);

    expect(getByTestId('indexPatternPlaceholderFormTitle')).toHaveTextContent('Test Title');
  });

  it('disables the save button on initialization', async () => {
    const { getByTestId } = render(<Component />);

    await waitFor(() => {
      expect(getByTestId('indexPatternPlaceholderFormSaveBtn')).toBeDisabled();
    });
  });
});
