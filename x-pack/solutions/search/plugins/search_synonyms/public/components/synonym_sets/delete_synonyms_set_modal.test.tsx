/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DeleteSynonymsSetModal } from './delete_synonyms_set_modal';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDeleteSynonymsSet } from '../../hooks/use_delete_synonyms_set';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../hooks/use_delete_synonyms_set', () => ({
  useDeleteSynonymsSet: jest.fn(() => ({
    mutate: jest.fn(),
  })),
}));

describe('DeleteSynonymsSetModal', () => {
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not use mutation when cancel is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();
    (useDeleteSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });
    render(
      <Wrapper>
        <DeleteSynonymsSetModal synonymsSetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(useDeleteSynonymsSet).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should delete the synonyms set when delete is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (useDeleteSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <DeleteSynonymsSetModal synonymsSetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(useDeleteSynonymsSet).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: '123' });
  });

  it('should show error message if synonyms set is attached to an index', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (useDeleteSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <DeleteSynonymsSetModal synonymsSetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(useDeleteSynonymsSet).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: '123' });

    act(() => {
      (useDeleteSynonymsSet as unknown as jest.Mock).mock.calls[0][1](
        'Synonyms set is attached to an index'
      );
    });

    expect(screen.getByText('Synonyms set is attached to an index')).toBeInTheDocument();
  });
});
