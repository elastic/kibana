/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { MigrationDataInputContextProvider, useMigrationDataInputContext } from '.';

describe('MigrationDataInputContext', () => {
  it('provides the context', () => {
    const openFlyout = jest.fn();
    const closeFlyout = jest.fn();
    const isFlyoutOpen = true;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MigrationDataInputContextProvider
        openFlyout={openFlyout}
        closeFlyout={closeFlyout}
        isFlyoutOpen={isFlyoutOpen}
      >
        {children}
      </MigrationDataInputContextProvider>
    );

    const { result } = renderHook(() => useMigrationDataInputContext(), { wrapper });

    expect(result.current.openFlyout).toBe(openFlyout);
    expect(result.current.closeFlyout).toBe(closeFlyout);
    expect(result.current.isFlyoutOpen).toBe(isFlyoutOpen);
  });

  it('throws an error when used outside of the provider', () => {
    try {
      renderHook(() => useMigrationDataInputContext());
    } catch (error) {
      expect(error).toEqual(
        new Error(
          'useMigrationDataInputContext must be used within a MigrationDataInputContextProvider'
        )
      );
    }
  });
});
