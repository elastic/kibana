/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { withLicense } from './with_license';

const run = async (
  type: 'basic' | 'platinum' | 'enterprise' | 'trial',
  onInsufficient?: jest.Mock
) => {
  const handler = jest.fn().mockResolvedValue('handled');
  const response = httpServerMock.createResponseFactory();
  const wrapped = withLicense(
    async () => licenseMock.createLicense({ license: { type } }),
    handler,
    onInsufficient
  );
  const result = await wrapped({} as never, httpServerMock.createKibanaRequest(), response);
  return { handler, response, result };
};

describe('withLicense', () => {
  it.each([['enterprise' as const], ['trial' as const]])('runs the handler on %s', async (type) => {
    const { handler, result } = await run(type);
    expect(handler).toHaveBeenCalled();
    expect(result).toBe('handled');
  });

  it.each([['basic' as const], ['platinum' as const]])(
    'answers 403 LICENSE_REQUIRED on %s',
    async (type) => {
      const { handler, response } = await run(type);
      expect(handler).not.toHaveBeenCalled();
      expect(response.forbidden).toHaveBeenCalledWith({
        body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
      });
    }
  );

  it('uses onInsufficient instead of the 403 when supplied', async () => {
    const onInsufficient = jest.fn().mockReturnValue('custom');
    const { handler, response, result } = await run('basic', onInsufficient);
    expect(result).toBe('custom');
    expect(handler).not.toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
  });
});
