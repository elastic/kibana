/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import {
  useGetLinkUrl,
  useGetLinkProps,
  withLink,
  isSecurityId,
  getAppIdsFromId,
  formatPath,
  isModified,
  concatPaths,
} from './links';
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

  describe('isSecurityId', () => {
    it('should return false for an external id', () => {
      const id = 'externalAppId:12345';
      const result = isSecurityId(id);
      expect(result).toBe(false);
    });

    it('should return true for an internal id', () => {
      const id = 'internalId';
      const result = isSecurityId(id);
      expect(result).toBe(true);
    });

    it('should return false for a root external id', () => {
      const id = 'externalAppId:';
      const result = isSecurityId(id);
      expect(result).toBe(false);
    });
  });

  describe('getAppIdsFromId', () => {
    it('should return the correct app and deep link ids for an external id', () => {
      const id = 'externalAppId:12345';
      const result = getAppIdsFromId(id);
      expect(result).toEqual(
        expect.objectContaining({ appId: 'externalAppId', deepLinkId: '12345' })
      );
    });

    it('should return the correct deep link id for an internal id', () => {
      const id = 'internalId';
      const result = getAppIdsFromId(id);
      expect(result).toEqual(expect.objectContaining({ deepLinkId: 'internalId' }));
    });

    it('should return the correct app id for a root external id', () => {
      const id = 'externalAppId:';
      const result = getAppIdsFromId(id);
      expect(result).toEqual(expect.objectContaining({ appId: 'externalAppId', deepLinkId: '' }));
    });

    it('should return the correct path', () => {
      expect(getAppIdsFromId('externalAppId:12345')).toEqual({
        appId: 'externalAppId',
        deepLinkId: '12345',
        path: '',
      });

      expect(getAppIdsFromId('externalAppId:/some/path')).toEqual({
        appId: 'externalAppId',
        deepLinkId: '',
        path: '/some/path',
      });

      expect(getAppIdsFromId('externalAppId:12345/some/path')).toEqual({
        appId: 'externalAppId',
        deepLinkId: '12345',
        path: '/some/path',
      });
    });
  });

  describe('concatPaths', () => {
    it('should return empty path for undefined or empty paths', () => {
      expect(concatPaths(undefined, undefined)).toEqual('');
      expect(concatPaths('', '')).toEqual('');
    });
    it('should return path if sub-path not defined or empty', () => {
      expect(concatPaths('/main/path', undefined)).toEqual('/main/path');
      expect(concatPaths('/main/path', '')).toEqual('/main/path');
    });
    it('should return sub-path if path not defined or empty', () => {
      expect(concatPaths(undefined, '/some/sub-path')).toEqual('/some/sub-path');
      expect(concatPaths('', '/some/sub-path')).toEqual('/some/sub-path');
    });
    it('should concatenate path and sub-path if defined', () => {
      expect(concatPaths('/main/path', '/some/sub-path')).toEqual('/main/path/some/sub-path');
    });
    it('should clean path before merging', () => {
      expect(concatPaths('/main/path/', '/some/sub-path')).toEqual('/main/path/some/sub-path');
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
      const result = isModified(event);
      expect(result).toBe(true);
    });

    it('should return false if event has no modifier keys', () => {
      const event = {
        metaKey: false,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
      } as unknown as React.MouseEvent;
      const result = isModified(event);
      expect(result).toBe(false);
    });
  });
});
