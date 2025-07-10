/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePutSynonymsSet } from '../../hooks/use_put_synonyms_set';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateSynonymsSetModal } from './create_new_set_modal';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_put_synonyms_set', () => ({
  usePutSynonymsSet: jest.fn().mockReturnValue({
    mutate: jest.fn(),
  }),
}));

describe('CreateNewSetModal', () => {
  const conflictError = new Error('Conflict') as unknown as {
    body: { statusCode: number; message: string };
  };
  conflictError.body = {
    statusCode: 409,
    message: 'A synonym with id test already exists.',
  };
  const TEST_IDS = {
    CreateButton: 'searchSynonymsCreateSynonymsSetModalCreateButton',
    CancelButton: 'searchSynonymsCreateSynonymsSetModalCancelButton',
    NameInput: 'searchSynonymsCreateSynonymsSetModalFieldText',
    ErrorText: 'searchSynonymsCreateSynonymsSetModalError',
    ForceWriteCheckbox: 'searchSynonymsCreateSynonymsSetModalForceWrite',
  };

  const ACTIONS = {
    TypeSetName: () => {
      fireEvent.change(screen.getByTestId(TEST_IDS.NameInput), {
        target: { value: 'test' },
      });
    },
    PressCreateButton: () => {
      fireEvent.click(screen.getByTestId(TEST_IDS.CreateButton));
    },
    PressCancelButton: () => {
      fireEvent.click(screen.getByTestId(TEST_IDS.CancelButton));
    },
    SimulateConflictError: () => {
      const onErrorCallback = (usePutSynonymsSet as jest.Mock).mock.calls[0][1];
      onErrorCallback(conflictError);
    },
    SimulateSuccess: () => {
      const onSuccessCallback = (usePutSynonymsSet as jest.Mock).mock.calls[0][0];
      onSuccessCallback();
    },
    PressForceWriteCheckbox: () => {
      fireEvent.click(screen.getByTestId(TEST_IDS.ForceWriteCheckbox));
    },
  };
  const queryClient = new QueryClient();
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );

  let onClose: jest.Mock;
  let mutate: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    mutate = jest.fn();
    (usePutSynonymsSet as unknown as jest.Mock).mockReturnValue({
      mutate,
    });
  });

  it('should not call mutation when cancel is pressed', () => {
    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );
    expect(usePutSynonymsSet).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

    act(ACTIONS.PressCancelButton);

    expect(onClose).toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('should disable create button when name is empty', () => {
    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    expect(screen.getByTestId(TEST_IDS.NameInput).getAttribute('value')).toBe('');
    expect(screen.getByTestId(TEST_IDS.CreateButton)).toBeDisabled();

    act(ACTIONS.TypeSetName);

    expect(screen.getByTestId(TEST_IDS.CreateButton)).toBeEnabled();
  });

  it('should create the synonyms set when create is pressed', () => {
    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    expect(usePutSynonymsSet).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

    act(ACTIONS.TypeSetName);
    act(ACTIONS.PressCreateButton);

    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: 'test', forceWrite: false });
    expect(onClose).not.toHaveBeenCalled();

    act(ACTIONS.SimulateSuccess);
    expect(onClose).toHaveBeenCalled();
  });

  it('should overwrite when force checkbox is checked', () => {
    render(
      <Wrapper>
        <CreateSynonymsSetModal onClose={onClose} />
      </Wrapper>
    );

    expect(usePutSynonymsSet).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));

    // Prepare modal to show conflict error
    act(ACTIONS.TypeSetName);
    act(ACTIONS.PressCreateButton);
    act(ACTIONS.SimulateConflictError);

    // Click force write checkbox and test create
    act(ACTIONS.PressForceWriteCheckbox);
    act(ACTIONS.PressCreateButton);

    expect(onClose).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ synonymsSetId: 'test', forceWrite: true });

    act(ACTIONS.SimulateSuccess);
    expect(onClose).toHaveBeenCalled();
  });
});
