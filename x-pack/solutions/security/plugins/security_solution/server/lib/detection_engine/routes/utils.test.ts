/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemResponseFactory } from './utils';
import { responseMock } from './__mocks__';

describe('utils', () => {
  describe('SiemResponseFactory', () => {
    it('builds a custom response', () => {
      const response = responseMock.create();
      const responseFactory = new SiemResponseFactory(response);

      responseFactory.error({ statusCode: 400 });
      expect(response.custom).toHaveBeenCalled();
    });

    it('generates a status_code key on the response', () => {
      const response = responseMock.create();
      const responseFactory = new SiemResponseFactory(response);

      responseFactory.error({ statusCode: 400 });
      const [[{ statusCode, body }]] = response.custom.mock.calls;

      expect(statusCode).toEqual(400);
      expect(body).toBeInstanceOf(Buffer);
      expect(JSON.parse(body!.toString())).toEqual(
        expect.objectContaining({
          message: 'Bad Request',
          status_code: 400,
        })
      );
    });
  });
});
