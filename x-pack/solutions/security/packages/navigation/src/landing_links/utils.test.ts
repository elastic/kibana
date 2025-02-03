/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getKibanaLinkProps } from './utils';
import * as links from '../links';
import type { NavigationLink } from '../types';

const item: NavigationLink = {
  id: 'internal-id',
  title: 'some title',
  skipUrlState: false,
};

const urlState = 'example-url-state';
const onLinkClick = jest.fn();

describe('getWrappedLinkProps', () => {
  let isSecurityIdSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create a spy on the isSecurityId function before each test
    isSecurityIdSpy = jest.spyOn(links, 'isSecurityId');
  });

  afterEach(() => {
    isSecurityIdSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('returns the correct WrappedLinkProps when id is not external and skipUrlState is false', () => {
    const result = getKibanaLinkProps({ item, urlState, onLinkClick });

    expect(result).toEqual({
      id: item.id,
      urlState,
      onClick: expect.any(Function),
    });

    expect(isSecurityIdSpy).toHaveBeenCalledWith(item.id);
    expect(onLinkClick).not.toHaveBeenCalled();

    result.onClick?.({} as unknown as React.MouseEvent<HTMLAnchorElement>);
    expect(onLinkClick).toHaveBeenCalledWith(item.id);
  });

  it('returns the correct WrappedLinkProps when id is external', () => {
    const id = 'external:id';
    const result = getKibanaLinkProps({ item: { ...item, id }, urlState });

    expect(result).toEqual({ id });
    expect(isSecurityIdSpy).toHaveBeenCalledWith(id);
  });

  it('returns the correct WrappedLinkProps when skipUrlState is true', () => {
    const id = 'internal-id';
    const result = getKibanaLinkProps({ item: { ...item, skipUrlState: true }, urlState });

    expect(result).toEqual({ id });
    expect(isSecurityIdSpy).toHaveBeenCalledWith(id);
  });
});
