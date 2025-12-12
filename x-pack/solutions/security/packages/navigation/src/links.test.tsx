/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { useGetLinkUrl, useGetLinkProps, withLink, formatPath, isModifiedEvent } from './links';
import { mockGetAppUrl, mockNavigateTo } from '../mocks/navigation';

jest.mock('./navigation');

const URL = '/the/mocked/url';
mockGetAppUrl.mockReturnValue(URL);

describe('links', () => {
  describe('useGetLinkUrl', () => {
    it('should return the correct link URL', () => {
      const { result } = renderHook(useGetLinkUrl);
      const getLinkUrl = result.current;

      const linkUrl = getLinkUrl({
        id: 'testId',
        path: 'testPath',
        absolute: false,
        urlState: 'testState',
      });

      expect(linkUrl).toEqual(URL);

      // Verify dependencies were called with correct parameters
      expect(mockGetAppUrl).toHaveBeenCalledWith({
        deepLinkId: 'testId',
        appId: undefined,
        path: 'testPath?testState',
        absolute: false,
      });
    });
  });

  describe('useGetLinkProps', () => {
    it('should return the correct link props', () => {
      const { result } = renderHook(useGetLinkProps);
      const getLinkProps = result.current;

      const linkProps = getLinkProps({
        id: 'testId',
        path: 'testPath',
        urlState: 'testState',
        onClick: jest.fn(),
      });

      expect(linkProps).toEqual({
        href: URL,
        onClick: expect.any(Function),
      });

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.MouseEvent;
      linkProps.onClick(mockEvent);

      expect(mockGetAppUrl).toHaveBeenCalledWith({
        deepLinkId: 'testId',
        appId: undefined,
        path: 'testPath?testState',
        absolute: false,
      });
      expect(mockNavigateTo).toHaveBeenCalledWith({ url: URL });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('withLink', () => {
    it('should return a wrapped component with link functionality', () => {
      const MockComponent = jest.fn(() => <div data-test-subj="mock-component" />);
      const WrappedComponent = withLink(MockComponent);

      const wrapper = render(<WrappedComponent id="testId" path="testPath" urlState="testState" />);

      expect(wrapper.queryByTestId('mock-component')).toBeInTheDocument();
      expect(MockComponent).toHaveBeenCalledWith(
        expect.objectContaining({ href: URL, onClick: expect.any(Function) }),
        {}
      );

      const mockEvent = { preventDefault: jest.fn() };
      // @ts-ignore-next-line
      const onClickProp = MockComponent.mock.calls[0][0].onClick;
      onClickProp?.(mockEvent);

      expect(mockNavigateTo).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('formatPath', () => {
    it('should format the path correctly with URL state', () => {
      const path = 'testPath';
      const urlState = 'testState';
      const result = formatPath(path, urlState);
      expect(result).toEqual('testPath?testState');
    });

    it('should format the path correctly without URL state', () => {
      const path = 'testPath';
      const urlState = '';
      const result = formatPath(path, urlState);
      expect(result).toEqual('testPath');
    });

    it('should format the path correctly with URL state and existing parameters', () => {
      const path = 'testPath?existingParam=value';
      const urlState = 'testState';
      const result = formatPath(path, urlState);
      expect(result).toEqual('testPath?existingParam=value&testState');
    });

    it('should format the path correctly with URL state and parameter path', () => {
      const path = 'testPath?parameterPath';
      const urlState = 'testState';
      const result = formatPath(path, urlState);
      expect(result).toEqual('testPath?parameterPath&testState');
    });
  });

  describe('isModified', () => {
    it('should return true if event has modifier keys', () => {
      const event = {
        metaKey: true,
        altKey: false,
        ctrlKey: false,
        shiftKey: true,
      } as unknown as React.MouseEvent;
      const result = isModifiedEvent(event);
      expect(result).toBe(true);
    });

    it('should return false if event has no modifier keys', () => {
      const event = {
        metaKey: false,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent;
      const result = isModifiedEvent(event);
      expect(result).toBe(false);
    });
  });
});
