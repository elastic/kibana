/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react';
import { HoverPopover } from './hover_popover';

describe('HoverPopover', () => {
  jest.useFakeTimers();

  describe('when not hovering', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <HoverPopover hoverContent="test hover content" anchorPosition="downCenter">
          {'test children'}
        </HoverPopover>
      );
    });

    it('should render the children', () => {
      expect(result.queryByText('test children')).toBeInTheDocument();
    });

    it('should not render the hover content', () => {
      expect(result.queryByText('test hover content')).not.toBeInTheDocument();
    });
  });

  describe('when hovering', () => {
    let result: RenderResult;
    beforeEach(() => {
      result = render(
        <HoverPopover hoverContent="test hover content" anchorPosition="downCenter">
          {'test children'}
        </HoverPopover>
      );

      act(() => {
        fireEvent.mouseEnter(result.getByTestId('HoverPopoverButton'));
        jest.runAllTimers();
      });
    });

    it('should render the children', () => {
      expect(result.queryByText('test children')).toBeInTheDocument();
    });

    it('should render hoverContent', () => {
      expect(result.queryByText('test hover content')).toBeInTheDocument();
    });

    describe('and then unhovering', () => {
      beforeEach(() => {
        act(() => {
          fireEvent.mouseLeave(result.getByTestId('HoverPopoverButton'));
          jest.runAllTimers();
        });
      });

      it('should render the children', () => {
        expect(result.queryByText('test children')).toBeInTheDocument();
      });

      it('should not render hoverContent', () => {
        expect(result.queryByText('test hover content')).not.toBeInTheDocument();
      });
    });

    describe('and then clicking ESC', () => {
      beforeEach(() => {
        act(() => {
          fireEvent.keyDown(result.getByText('test hover content'), {
            key: 'Escape',
            code: 'Escape',
          });
          jest.runAllTimers();
        });
      });

      it('should render the children', () => {
        expect(result.queryByText('test children')).toBeInTheDocument();
      });

      it('should not render hoverContent', () => {
        expect(result.queryByText('test hover content')).not.toBeInTheDocument();
      });
    });
  });
});
