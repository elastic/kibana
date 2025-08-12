/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DeleteRulesetModal } from './delete_ruleset_modal';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDeleteRuleset } from '../../hooks/use_delete_query_rules_ruleset';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../hooks/use_delete_query_rules_ruleset', () => ({
  useDeleteRuleset: jest.fn(() => ({
    mutate: jest.fn(),
  })),
}));

describe('DeleteRulesetModal', () => {
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
    (useDeleteRuleset as unknown as jest.Mock).mockReturnValue({
      mutate,
    });
    render(
      <Wrapper>
        <DeleteRulesetModal rulesetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    act(() => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(onClose).toHaveBeenCalled();
    expect(useDeleteRuleset).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should delete the ruleset when delete is pressed', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (useDeleteRuleset as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <DeleteRulesetModal rulesetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    // First need to check the confirmation checkbox
    act(() => {
      fireEvent.click(screen.getByLabelText('This ruleset is safe to delete'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Delete ruleset'));
    });

    expect(useDeleteRuleset).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ rulesetId: '123' });
  });

  it('should show error message if ruleset is attached to an index', () => {
    const onClose = jest.fn();
    const mutate = jest.fn();

    (useDeleteRuleset as unknown as jest.Mock).mockReturnValue({
      mutate,
    });

    render(
      <Wrapper>
        <DeleteRulesetModal rulesetId="123" closeDeleteModal={onClose} />
      </Wrapper>
    );

    // First need to check the confirmation checkbox
    act(() => {
      fireEvent.click(screen.getByLabelText('This ruleset is safe to delete'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Delete ruleset'));
    });

    expect(useDeleteRuleset).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ rulesetId: '123' });

    act(() => {
      (useDeleteRuleset as unknown as jest.Mock).mock.calls[0][1](
        'Ruleset is attached to an index'
      );
    });

    expect(screen.getByText('Ruleset is attached to an index')).toBeInTheDocument();
  });
});
