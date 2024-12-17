/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingBody } from './onboarding_body';
import { useBodyConfig } from './hooks/use_body_config';
import { useExpandedCard } from './hooks/use_expanded_card';
import { useCompletedCards } from './hooks/use_completed_cards';

jest.mock('../onboarding_context');
jest.mock('./hooks/use_body_config');
jest.mock('./hooks/use_expanded_card');
jest.mock('./hooks/use_completed_cards');

const mockUseBodyConfig = useBodyConfig as jest.Mock;
const mockUseExpandedCard = useExpandedCard as jest.Mock;
const mockUseCompletedCards = useCompletedCards as jest.Mock;

// Mock the hooks to return desired test data
const mockComponent = jest.fn(function Component(_: { setComplete: (complete: boolean) => void }) {
  return <div>{'Card 1 Content'}</div>;
});
mockUseBodyConfig.mockReturnValue([
  {
    title: 'Group 1',
    cards: [
      {
        id: 'card-1',
        title: 'Card 1',
        icon: 'icon1',
        Component: mockComponent,
      },
    ],
  },
]);

const mockSetExpandedCardId = jest.fn();
mockUseExpandedCard.mockReturnValue({
  expandedCardId: null,
  setExpandedCardId: mockSetExpandedCardId,
});
const mockCheckCardComplete = jest.fn();
const mockSetCardComplete = jest.fn();
mockUseCompletedCards.mockReturnValue({
  isCardComplete: jest.fn(() => false),
  setCardComplete: mockSetCardComplete,
  getCardCheckCompleteResult: jest.fn(),
  checkCardComplete: mockCheckCardComplete,
});

describe('OnboardingBody Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the OnboardingBody component with the correct content', () => {
    render(<OnboardingBody />);
    expect(screen.getByText('Group 1')).toBeInTheDocument();
    expect(screen.getByText('Card 1')).toBeInTheDocument();
  });

  describe('when the card is expanded', () => {
    beforeEach(() => {
      render(<OnboardingBody />);
      fireEvent.click(screen.getByText('Card 1'));
    });

    it('should set the expanded card', () => {
      expect(mockSetExpandedCardId).toHaveBeenCalledWith('card-1');
    });

    it('should check the card for completion', () => {
      expect(mockCheckCardComplete).toHaveBeenCalledWith('card-1');
    });
  });

  describe('when the card is collapsed', () => {
    beforeEach(() => {
      mockUseExpandedCard.mockReturnValueOnce({
        expandedCardId: 'card-1',
        setExpandedCardId: mockSetExpandedCardId,
      });

      render(<OnboardingBody />);

      fireEvent.click(screen.getByText('Card 1'));
    });

    it('should unset the expanded the card', async () => {
      expect(mockSetExpandedCardId).toHaveBeenCalledWith(null);
    });

    it('should not check the card for completion', () => {
      expect(mockCheckCardComplete).not.toHaveBeenCalledWith('card-1');
    });
  });

  describe('when the card is set as complete from the card component', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockComponent.mockImplementationOnce(function Component({ setComplete }) {
        setComplete(true);
        return <div>{'Card 1 Content'}</div>;
      });

      render(<OnboardingBody />);
      act(() => {
        fireEvent.click(screen.getByText('Card 1'));
      });
    });

    it('should set the card as complete', () => {
      expect(mockSetCardComplete).toHaveBeenCalledWith('card-1', true);
    });
  });

  describe('when the card is set as incomplete from the card component', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockComponent.mockImplementationOnce(function Component({ setComplete }) {
        setComplete(false);
        return <div>{'Card 1 Content'}</div>;
      });

      render(<OnboardingBody />);
      act(() => {
        fireEvent.click(screen.getByText('Card 1'));
      });
    });

    it('should set the card as incomplete', () => {
      expect(mockSetCardComplete).toHaveBeenCalledWith('card-1', false);
    });
  });
});
