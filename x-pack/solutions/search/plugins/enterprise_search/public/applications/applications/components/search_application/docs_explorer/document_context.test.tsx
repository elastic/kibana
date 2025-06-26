/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderHook, act } from '@testing-library/react';

import { DocumentProvider, useSelectedDocument } from './document_context';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DocumentProvider>{children}</DocumentProvider>
);

describe('DocumentContext', () => {
  it('defines `selectedDocument` and defaults to `null`', () => {
    const { result } = renderHook(useSelectedDocument, { wrapper });
    expect(result.current).toHaveProperty('selectedDocument', null);
  });

  it('defines `setSelectedDocument`', () => {
    const { result } = renderHook(useSelectedDocument, { wrapper });
    expect(result.current).toHaveProperty('setSelectedDocument');
  });

  it('sets the selected document using `setSelectedDocument`', () => {
    const { result } = renderHook(useSelectedDocument, { wrapper });

    act(() => {
      result.current.setSelectedDocument({ foo: 'bar' });
    });

    expect(result.current.selectedDocument).toEqual({ foo: 'bar' });
  });
});
