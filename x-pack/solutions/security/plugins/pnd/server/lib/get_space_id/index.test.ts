/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getSpaceId } from '.';

const request = {} as KibanaRequest;

describe('getSpaceId', () => {
  it('resolves the space id from the request via the spaces service', () => {
    const spaces = {
      spacesService: { getSpaceId: jest.fn().mockReturnValue('agent-3') },
    } as unknown as SpacesPluginStart;

    expect(getSpaceId(spaces, request)).toBe('agent-3');
  });

  it('passes the request to the spaces service', () => {
    const getSpaceIdMock = jest.fn().mockReturnValue('agent-3');
    const spaces = {
      spacesService: { getSpaceId: getSpaceIdMock },
    } as unknown as SpacesPluginStart;

    getSpaceId(spaces, request);

    expect(getSpaceIdMock).toHaveBeenCalledWith(request);
  });

  it('falls back to the default space when spaces is unavailable', () => {
    expect(getSpaceId(undefined, request)).toBe('default');
  });
});
