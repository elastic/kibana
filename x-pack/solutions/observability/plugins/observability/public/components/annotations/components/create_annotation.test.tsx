/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { core, render } from '../../../utils/test_helper';
import { getDefaultAnnotation } from '../default_annotation';
import type { CreateAnnotationForm } from './create_annotation';
import CreateAnnotation from './create_annotation';

function Wrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm<CreateAnnotationForm>({
    defaultValues: getDefaultAnnotation({}),
    mode: 'all',
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('CreateAnnotation', () => {
  const createAnnotation = jest.fn();

  const renderFlyout = () =>
    render(
      <Wrapper>
        <CreateAnnotation
          isCreateAnnotationsOpen
          isLoading={false}
          onSave={jest.fn()}
          onCancel={jest.fn()}
          createAnnotation={createAnnotation}
          updateAnnotation={jest.fn()}
          deleteAnnotation={jest.fn()}
        />
      </Wrapper>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    core.settings.client.get.mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
  });

  it('shows an error message below the title field when it is emptied', async () => {
    renderFlyout();

    const title = await screen.findByTestId('annotationTitle');
    await userEvent.clear(title);

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
  });

  it('moves focus to the title field when saving without a title', async () => {
    renderFlyout();

    const title = await screen.findByTestId('annotationTitle');
    await userEvent.clear(title);
    await userEvent.click(await screen.findByTestId('annotationSaveButton'));

    await waitFor(() => expect(title).toHaveFocus());
    expect(createAnnotation).not.toHaveBeenCalled();
  });
});
