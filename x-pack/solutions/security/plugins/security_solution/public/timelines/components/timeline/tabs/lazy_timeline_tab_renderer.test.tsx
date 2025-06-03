/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import type { LazyTimelineTabRendererProps } from './lazy_timeline_tab_renderer';
import { LazyTimelineTabRenderer } from './lazy_timeline_tab_renderer';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types';

jest.mock('../../../../common/hooks/use_selector');

describe('LazyTimelineTabRenderer', () => {
  const mockUseDeepEqualSelector = useDeepEqualSelector as jest.Mock;
  const defaultProps = {
    dataTestSubj: 'test',
    shouldShowTab: true,
    timelineId: TimelineId.test,
  };

  const TestComponent = ({ children, ...restProps }: Partial<LazyTimelineTabRendererProps>) => (
    <LazyTimelineTabRenderer {...defaultProps} {...restProps}>
      <div>{children ?? 'test component'}</div>
    </LazyTimelineTabRenderer>
  );
  const renderTestComponents = (props?: Partial<LazyTimelineTabRendererProps>) => {
    const { children, ...restProps } = props ?? {};
    return render(<TestComponent {...restProps}>{children}</TestComponent>);
  };

  beforeEach(() => {
    mockUseDeepEqualSelector.mockClear();
  });

  describe('timeline visibility', () => {
    it('should NOT render children when the timeline show status is false', () => {
      mockUseDeepEqualSelector.mockReturnValue({ show: false });
      const { queryByText } = renderTestComponents();
      expect(queryByText('test component')).not.toBeInTheDocument();
    });

    it('should render children when the timeline show status is true', () => {
      mockUseDeepEqualSelector.mockReturnValue({ show: true });

      const { getByText } = renderTestComponents();

      expect(getByText('test component')).toBeInTheDocument();
    });
  });

  describe('tab visibility', () => {
    it('should not render children when show tab is false', () => {
      const { queryByText } = renderTestComponents({ shouldShowTab: false });

      expect(queryByText('test component')).not.toBeInTheDocument();
    });
  });

  describe('re-rendering', () => {
    const testChildString = 'new content';
    const mockFnShouldThatShouldOnlyRunOnce = jest.fn();

    const TestChild = () => {
      useEffect(() => {
        mockFnShouldThatShouldOnlyRunOnce();
      }, []);
      return <div>{testChildString}</div>;
    };

    const RerenderTestComponent = (props?: Partial<LazyTimelineTabRendererProps>) => (
      <TestComponent {...props}>
        <TestChild />
      </TestComponent>
    );

    beforeEach(() => {
      jest.resetAllMocks();
      mockUseDeepEqualSelector.mockReturnValue({ show: true });
    });

    it('should NOT re-render children after the first render', () => {
      const { queryByText } = render(<RerenderTestComponent />);
      expect(queryByText(testChildString)).toBeInTheDocument();
      expect(mockFnShouldThatShouldOnlyRunOnce).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-render children even if timeline show status changes', () => {
      const { rerender, queryByText } = render(<RerenderTestComponent />);
      mockUseDeepEqualSelector.mockReturnValue({ show: false });
      rerender(<RerenderTestComponent />);
      expect(queryByText(testChildString)).toBeInTheDocument();
      expect(mockFnShouldThatShouldOnlyRunOnce).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-render children even if tab visibility status changes', () => {
      const { rerender, queryByText } = render(<RerenderTestComponent />);
      rerender(<RerenderTestComponent shouldShowTab={false} />);
      rerender(<RerenderTestComponent shouldShowTab={true} />);
      expect(queryByText(testChildString)).toBeInTheDocument();
      expect(mockFnShouldThatShouldOnlyRunOnce).toHaveBeenCalledTimes(1);
    });

    it('should re-render if the component is unmounted and remounted', () => {
      const { rerender, queryByText, unmount } = render(<RerenderTestComponent />, {
        // TODO: fails in concurrent mode
        legacyRoot: true,
      });
      unmount();
      rerender(<RerenderTestComponent shouldShowTab={true} />);
      expect(queryByText(testChildString)).toBeInTheDocument();
      expect(mockFnShouldThatShouldOnlyRunOnce).toHaveBeenCalledTimes(2);
    });
  });
});
