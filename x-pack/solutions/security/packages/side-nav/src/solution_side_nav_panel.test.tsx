/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SolutionSideNavPanel, type SolutionSideNavPanelProps } from './solution_side_nav_panel';
import { TELEMETRY_EVENT } from './telemetry/const';
import { METRIC_TYPE } from '@kbn/analytics';
import { TelemetryContextProvider } from './telemetry/telemetry_context';
import type { SolutionSideNavItem } from './types';
import { type LinkCategories, LinkCategoryType } from '@kbn/security-solution-navigation';

const mockUseIsWithinMinBreakpoint = jest.fn(() => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinMinBreakpoint: () => mockUseIsWithinMinBreakpoint(),
  };
});

const mockTrack = jest.fn();

const mockItems: SolutionSideNavItem[] = [
  {
    id: 'hosts',
    label: 'Hosts',
    href: '/hosts',
    description: 'Hosts description',
  },
  {
    id: 'network',
    label: 'Network',
    href: '/network',
    description: 'Network description',
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    href: '/kubernetes',
    description: 'Kubernetes description',
    isBeta: true,
  },
];

const mockCategories: LinkCategories = [
  {
    label: 'HOSTS CATEGORY',
    linkIds: ['hosts', 'network'],
  },
  {
    label: 'Empty category',
    linkIds: [],
  },
  {
    type: LinkCategoryType.separator,
    linkIds: ['kubernetes'],
  },
];

const bottomNavOffset = '10px';
const PANEL_TITLE = 'test title';
const mockOnClose = jest.fn();
const mockOnOutsideClick = jest.fn();
const renderNavPanel = (props: Partial<SolutionSideNavPanelProps> = {}) =>
  render(
    <>
      <div data-test-subj="outsideClickDummy" />
      <TelemetryContextProvider tracker={mockTrack}>
        <SolutionSideNavPanel
          items={mockItems}
          title={PANEL_TITLE}
          onClose={mockOnClose}
          onOutsideClick={mockOnOutsideClick}
          {...props}
        />
      </TelemetryContextProvider>
    </>
  );

describe('SolutionSideNavPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all main items', () => {
    const result = renderNavPanel();

    expect(result.getByText(PANEL_TITLE)).toBeInTheDocument();

    mockItems.forEach((item) => {
      expect(result.getByText(item.label)).toBeInTheDocument();
    });
  });

  it('should only render categories with items', () => {
    const result = renderNavPanel({ categories: mockCategories });

    mockCategories.forEach((mockCategory) => {
      if (!mockCategory.label) return; // omit separator categories
      if (mockCategory.linkIds?.length) {
        expect(result.getByText(mockCategory.label)).toBeInTheDocument();
      } else {
        expect(result.queryByText(mockCategory.label)).not.toBeInTheDocument();
      }
    });
  });

  it('should render separator categories with items', () => {
    const result = renderNavPanel({ categories: mockCategories });
    mockCategories.forEach((mockCategory) => {
      if (mockCategory.type !== LinkCategoryType.separator) return; // omit non-separator categories
      mockCategory.linkIds?.forEach((linkId) => {
        expect(result.queryByTestId(`solutionSideNavPanelLink-${linkId}`)).toBeInTheDocument();
      });
    });
  });

  describe('links', () => {
    it('should contain correct href in links', () => {
      const result = renderNavPanel();
      expect(result.getByTestId(`solutionSideNavPanelLink-${'hosts'}`).getAttribute('href')).toBe(
        '/hosts'
      );
      expect(result.getByTestId(`solutionSideNavPanelLink-${'network'}`).getAttribute('href')).toBe(
        '/network'
      );
    });

    it('should call onClick callback if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'users',
          label: 'Users',
          href: '/users',
          onClick: mockOnClick,
        },
      ];
      const result = renderNavPanel({ items });
      result.getByTestId(`solutionSideNavPanelLink-${'users'}`).click();
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should send telemetry if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'users',
          label: 'Users',
          href: '/users',
          onClick: mockOnClick,
        },
      ];
      const result = renderNavPanel({ items });
      result.getByTestId(`solutionSideNavPanelLink-${'users'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION}${'users'}`
      );
    });
  });

  describe('bottom offset', () => {
    it('should add bottom offset', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(true);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('solutionSideNavPanel')).toHaveStyle({ bottom: bottomNavOffset });
    });

    it('should not add bottom offset if not large screen', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(false);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('solutionSideNavPanel')).not.toHaveStyle({
        bottom: bottomNavOffset,
      });
    });
  });

  describe('close', () => {
    it('should call onClose callback if link clicked', () => {
      const result = renderNavPanel();
      result.getByTestId(`solutionSideNavPanelLink-${'hosts'}`).click();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose callback if outside clicked', () => {
      const result = renderNavPanel();
      result.getByTestId('outsideClickDummy').click();
      waitFor(() => {
        expect(mockOnOutsideClick).toHaveBeenCalled();
      });
    });
  });
});
