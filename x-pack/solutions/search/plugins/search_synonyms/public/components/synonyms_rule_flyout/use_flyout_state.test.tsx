/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useSynonymRuleFlyoutState hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  describe('hasChanges', () => {
    describe('create mode', () => {
      describe('equivalent terms', () => {
        it('should be false by default in create mode', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: '',
                },
                flyoutMode: 'create',
                renderExplicit: false,
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
        });

        it('should be true when fromTerms has changes in create mode', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: '',
                },
                flyoutMode: 'create',
                renderExplicit: false,
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
          const { onCreateOption } = result.current;
          act(() => {
            onCreateOption('test');
          });
          await waitFor(() => {
            expect(result.current.hasChanges).toBe(true);
          });
        });
      });
      describe('explicit terms', () => {
        it('should be false by default in create mode', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: '',
                },
                flyoutMode: 'create',
                renderExplicit: true,
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
        });

        it('should be true when fromTerms has changes ', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: '',
                },
                flyoutMode: 'create',
                renderExplicit: true,
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
          const { onCreateOption } = result.current;
          act(() => {
            onCreateOption('test');
          });
          await waitFor(() => {
            expect(result.current.hasChanges).toBe(true);
          });
        });
      });

      it('should be true when mapToTerms has changes', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: '',
              },
              flyoutMode: 'create',
              renderExplicit: true,
            }),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.hasChanges).toBe(false);
        });
        const { onMapToChange } = result.current;
        act(() => {
          onMapToChange('test');
        });
        await waitFor(() => {
          expect(result.current.hasChanges).toBe(true);
        });
      });
    });
    describe('edit mode', () => {
      describe('equivalent terms', () => {
        it('should be true when fromTerms has changes', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: 'synonym1,synonym2',
                },
                flyoutMode: 'edit',
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
          const { onCreateOption } = result.current;
          act(() => {
            onCreateOption('test');
          });
          await waitFor(() => {
            expect(result.current.hasChanges).toBe(true);
          });
        });
      });

      describe('explicit terms', () => {
        it('should be true when mapToTerms has changes', async () => {
          const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
          const { result } = renderHook(
            () =>
              useSynonymRuleFlyoutState({
                synonymRule: {
                  synonyms: 'synonym1 => synonym2',
                },
                flyoutMode: 'edit',
              }),
            { wrapper }
          );

          await waitFor(() => {
            expect(result.current.hasChanges).toBe(false);
          });
          const { onMapToChange } = result.current;
          act(() => {
            onMapToChange('test');
          });
          await waitFor(() => {
            expect(result.current.hasChanges).toBe(true);
          });
        });
      });
    });
  });

  describe('reset changes', () => {
    it('should reset changes in equivalent when in edit mode', async () => {
      const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
      const { result } = renderHook(
        () =>
          useSynonymRuleFlyoutState({
            synonymRule: {
              synonyms: 'synonym1,synonym2',
            },
            flyoutMode: 'edit',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
      });
      const { onCreateOption, resetChanges } = result.current;
      act(() => {
        onCreateOption('test');
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.fromTerms).toEqual([
          expect.objectContaining({ label: 'synonym1' }),
          expect.objectContaining({ label: 'synonym2' }),
          expect.objectContaining({ label: 'test' }),
        ]);
      });

      act(() => {
        resetChanges();
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.fromTerms).toEqual([
          expect.objectContaining({ label: 'synonym1' }),
          expect.objectContaining({ label: 'synonym2' }),
        ]);
      });
    });

    it('should reset changes in explicit when in edit mode', async () => {
      const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
      const { result } = renderHook(
        () =>
          useSynonymRuleFlyoutState({
            synonymRule: {
              synonyms: 'synonym1 => synonym2',
            },
            flyoutMode: 'edit',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
      });
      const { onMapToChange, resetChanges } = result.current;
      act(() => {
        onMapToChange('test');
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.mapToTerms).toBe('test');
      });

      act(() => {
        resetChanges();
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.mapToTerms).toBe('synonym2');
      });
    });

    it('should reset changes in equivalent when in create mode', async () => {
      const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
      const { result } = renderHook(
        () =>
          useSynonymRuleFlyoutState({
            synonymRule: {
              synonyms: '',
            },
            flyoutMode: 'create',
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
      });
      const { onCreateOption, resetChanges } = result.current;
      act(() => {
        onCreateOption('test');
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.fromTerms).toEqual([expect.objectContaining({ label: 'test' })]);
      });

      act(() => {
        resetChanges();
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.fromTerms).toEqual([]);
      });
    });

    it('should reset changes in explicit when in create mode', async () => {
      const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
      const { result } = renderHook(
        () =>
          useSynonymRuleFlyoutState({
            synonymRule: {
              synonyms: '',
            },
            flyoutMode: 'create',
            renderExplicit: true,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
      });
      const { onMapToChange, resetChanges, onCreateOption } = result.current;
      act(() => {
        onMapToChange('test');
        onCreateOption('from');
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.fromTerms).toEqual([expect.objectContaining({ label: 'from' })]);
        expect(result.current.mapToTerms).toBe('test');
      });

      act(() => {
        resetChanges();
      });
      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.fromTerms).toEqual([]);
        expect(result.current.mapToTerms).toBe('');
      });
    });

    describe('fromTerms validation', () => {
      it('should be invalid when fromTerms has multiple explicit separators', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: '',
              },
              flyoutMode: 'create',
              renderExplicit: true,
            }),
          { wrapper }
        );

        const { onCreateOption, canSave } = result.current;
        act(() => {
          onCreateOption('from => term => term');
        });
        await waitFor(() => {
          expect(result.current.isFromTermsInvalid).toBe(true);
          expect(result.current.fromTermErrors).toEqual([
            'Explicit separator "=>" is not allowed in terms.',
          ]);
          expect(canSave).toBe(false);
        });
      });
      it('should be invalid when search term exist in fromTerms', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: 'search',
              },
              flyoutMode: 'edit',
            }),
          { wrapper }
        );

        const { onCreateOption, canSave } = result.current;
        act(() => {
          onCreateOption('search');
        });
        await waitFor(() => {
          expect(result.current.isFromTermsInvalid).toBe(true);
          expect(result.current.fromTermErrors).toEqual(['Term already exists.']);
          expect(canSave).toBe(false);
        });
      });
    });
    describe('mapToTerms validation', () => {
      it('shoud be invalid when mapToTerms is empty', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: '',
              },
              flyoutMode: 'create',
              renderExplicit: true,
            }),
          { wrapper }
        );

        const { onMapToChange, canSave } = result.current;
        act(() => {
          onMapToChange('');
        });
        await waitFor(() => {
          expect(result.current.isMapToTermsInvalid).toBe(true);
          expect(result.current.mapToTermErrors).toEqual(['Terms cannot be empty.']);
          expect(canSave).toBe(false);
        });
      });
      it('should be invalid when mapToTerms has explicit separators', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: '',
              },
              flyoutMode: 'create',
              renderExplicit: true,
            }),
          { wrapper }
        );

        const { onMapToChange, canSave } = result.current;
        act(() => {
          onMapToChange('from => term => term');
        });
        await waitFor(() => {
          expect(result.current.isMapToTermsInvalid).toBe(true);
          expect(result.current.mapToTermErrors).toEqual([
            'Explicit separator "=>" is not allowed in terms.',
          ]);
          expect(canSave).toBe(false);
        });
      });
      it('should be invalid when mapToTerms has empty values', async () => {
        const { useSynonymRuleFlyoutState } = jest.requireActual('./use_flyout_state');
        const { result } = renderHook(
          () =>
            useSynonymRuleFlyoutState({
              synonymRule: {
                synonyms: 'test => thing',
              },
              flyoutMode: 'edit',
            }),
          { wrapper }
        );

        const { onMapToChange, canSave } = result.current;
        act(() => {
          onMapToChange('from,,term');
        });
        await waitFor(() => {
          expect(result.current.isMapToTermsInvalid).toBe(true);
          expect(result.current.mapToTermErrors).toEqual(['Terms cannot be empty.']);
          expect(canSave).toBe(false);
        });
      });
    });
  });
});
