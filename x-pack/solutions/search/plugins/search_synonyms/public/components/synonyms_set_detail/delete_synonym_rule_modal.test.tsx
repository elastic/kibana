/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteSynonymRule } from '../../hooks/use_delete_synonym_rule';
import { DeleteSynonymRuleModal } from './delete_synonym_rule_modal';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('../../hooks/use_delete_synonym_rule', () => ({
  useDeleteSynonymRule: jest.fn(() => ({
    mutate: jest.fn(),
  })),
}));

describe('DeleteSynonymRuleModal', () => {
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
    (useDeleteSynonymRule as unknown as jest.Mock).mockReturnValue({
      mutate,
    });
    render(
      <Wrapper>
        <DeleteSynonymRuleModal synonymsSetId="123" ruleId="456" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(useDeleteSynonymRule).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should delete the synonym rule when delete is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (useDeleteSynonymRule as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <DeleteSynonymRuleModal synonymsSetId="123" ruleId="456" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(useDeleteSynonymRule).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: '123', ruleId: '456' });
  });
});
