/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePutSynonymsSet } from '../../hooks/use_put_synonyms_set';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CreateSynonymsSetModal } from './create_new_set_modal';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_put_synonyms_set', () => ({
  usePutSynonymsSet: jest.fn().mockReturnValue({
    mutate: jest.fn(),
  }),
}));

describe('CreateNewSetModal', () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should note use mutation when cancel is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();
    (usePutSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });
    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(usePutSynonymsSet).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should create the synonyms set when create is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (usePutSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    expect(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton')).toBeDisabled();

    act(() => {
      fireEvent.change(screen.getByTestId('searchSynonymsCreateSynonymsSetModalFieldText'), {
        target: { value: 'test' },
      });
    });
    expect(
      screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton')
    ).not.toBeDisabled();

    act(() => {
      fireEvent.click(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton'));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(usePutSynonymsSet).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: 'test', forceWrite: false });
  });

  it('should return error if synonyms set already exists', () => {
    const conflictError = new Error('Conflict') as unknown as {
      body: { statusCode: number; message: string };
    };
    conflictError.body = {
      statusCode: 409,
      message: 'A synonym with id test already exists.',
    };
    const onClose = jest.fn();
    const mutate = jest.fn();

    (usePutSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    expect(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton')).toBeDisabled();

    act(() => {
      fireEvent.change(screen.getByTestId('searchSynonymsCreateSynonymsSetModalFieldText'), {
        target: { value: 'test' },
      });
    });
    expect(
      screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton')
    ).not.toBeDisabled();

    act(() => {
      fireEvent.click(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton'));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(usePutSynonymsSet).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: 'test', forceWrite: false });

    act(() => {
      (usePutSynonymsSet as unknown as jest.Mock).mock.calls[0][1](conflictError);
    });
    expect(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton')).toBeDisabled();
    expect(screen.getByTestId('searchSynonymsCreateSynonymsSetModalError')).toBeInTheDocument();
    expect(screen.getByTestId('searchSynonymsCreateSynonymsSetModalForceWrite')).not.toBeChecked();

    act(() => {
      fireEvent.click(screen.getByTestId('searchSynonymsCreateSynonymsSetModalForceWrite'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('searchSynonymsCreateSynonymsSetModalCreateButton'));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(usePutSynonymsSet).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: 'test', forceWrite: true });
  });
});
