/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { useExpandedCard } from './use_expanded_card';
import type { OnboardingCardId } from '../../../constants';
import { waitFor, renderHook, act } from '@testing-library/react';

const mockSetCard = vi.fn();
vi.mock('../../hooks/use_url_detail', async () => {
      const mocked = {
      ...(await vi.importActual('../../hooks/use_url_detail')),
      useUrlDetail: () => ({ setCard: mockSetCard }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useLocation: () => ({ hash: '#card-1', pathname: '/test' }),
    };
      return { ...mocked, default: mocked };
    });

describe('useExpandedCard Hook', () => {
  const mockCardId = 'card-1' as OnboardingCardId;
  const mockScrollTo = vi.fn();
  global.window.scrollTo = mockScrollTo;
  vi.useFakeTimers();

  const mockGetElementById = vi.fn().mockReturnValue({
    focus: vi.fn(),
    offsetTop: 100,
  });
  document.getElementById = mockGetElementById;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when the page is completely loaded', () => {
    beforeEach(() => {
      renderHook(useExpandedCard);
    });

    it('should scroll to the expanded card id from the hash', async () => {
      // Ensure that scroll and focus were triggered
      await waitFor(() => {
        expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
        expect(mockScrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'smooth' });
      });
    });
  });

  describe('when the card is expanded manually', () => {
    beforeEach(() => {
      mockGetElementById.mockReturnValueOnce({
        focus: vi.fn(),
        offsetTop: 200,
      });
    });

    describe('when scroll is disabled', () => {
      beforeEach(() => {
        const { result } = renderHook(useExpandedCard);
        act(() => {
          result.current.setExpandedCardId(mockCardId, { scroll: false });
        });
      });

      it('should set the expanded card id', () => {
        expect(mockSetCard).toHaveBeenCalledWith(mockCardId);
      });

      it('should not scroll', async () => {
        // Ensure that scroll and focus were triggered
        await waitFor(() => {
          expect(mockGetElementById).not.toHaveBeenCalled();
          expect(mockScrollTo).not.toHaveBeenCalled();
        });
      });
    });

    describe('when scroll is enabled', () => {
      beforeEach(() => {
        const { result } = renderHook(useExpandedCard);
        act(() => {
          result.current.setExpandedCardId(mockCardId, { scroll: true });
        });
      });

      it('should set the expanded card id', () => {
        expect(mockSetCard).toHaveBeenCalledWith(mockCardId);
      });

      it('should scroll', async () => {
        // Ensure that scroll and focus were triggered
        await waitFor(() => {
          expect(mockGetElementById).toHaveBeenCalledWith(mockCardId);
          expect(mockScrollTo).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' });
        });
      });
    });
  });
});
