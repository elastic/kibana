/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_DEFAULT_PAGE, ENDPOINT_DEFAULT_PAGE_SIZE } from '../constants';
import { HostStatus } from '../types';
import { GetMetadataListRequestSchema } from '../../api/endpoint';
import { GetMetadataRequestSchema } from '../../api/endpoint/metadata/get_metadata';

// NOTE: Even though schemas are kept in common/api/endpoint - we keep tests here, because common/api should import from outside
describe('endpoint metadata schema', () => {
  describe('GetMetadataRequestSchema', () => {
    const params = GetMetadataRequestSchema.params;

    it('should accept a valid id', () => {
      expect(params.validate({ id: 'ed518850-681a-4d60-bb98-e22640cae2a8' })).toEqual({
        id: 'ed518850-681a-4d60-bb98-e22640cae2a8',
      });
    });

    it('should reject id longer than 256 characters', () => {
      const longId = 'a'.repeat(257);
      expect(() => params.validate({ id: longId })).toThrowError();
    });

    it('should accept id exactly 256 characters long', () => {
      const maxId = 'a'.repeat(256);
      expect(params.validate({ id: maxId })).toEqual({ id: maxId });
    });
  });

  describe('GetMetadataListRequestSchemaV2', () => {
    const query = GetMetadataListRequestSchema.query;

    it('should return correct query params when valid', () => {
      const queryParams = {
        page: 1,
        pageSize: 20,
        kuery: 'some kuery',
        hostStatuses: [HostStatus.HEALTHY.toString()],
      };
      expect(query.validate(queryParams)).toEqual(queryParams);
    });

    it('should correctly use default values', () => {
      const expected = { page: ENDPOINT_DEFAULT_PAGE, pageSize: ENDPOINT_DEFAULT_PAGE_SIZE };
      expect(query.validate(undefined)).toEqual(expected);
      expect(query.validate({ page: undefined })).toEqual(expected);
      expect(query.validate({ pageSize: undefined })).toEqual(expected);
      expect(query.validate({ page: undefined, pageSize: undefined })).toEqual(expected);
    });

    it('should throw if page param is not a number', () => {
      expect(() => query.validate({ page: 'notanumber' })).toThrowError();
    });

    it('should throw if page param is less than 0', () => {
      expect(() => query.validate({ page: -1 })).toThrowError();
    });

    it('should throw if pageSize param is not a number', () => {
      expect(() => query.validate({ pageSize: 'notanumber' })).toThrowError();
    });

    it('should throw if pageSize param is less than 1', () => {
      expect(() => query.validate({ pageSize: 0 })).toThrowError();
    });

    it('should throw if pageSize param is greater than 10000', () => {
      expect(() => query.validate({ pageSize: 10001 })).toThrowError();
    });

    it('should throw if kuery is not string', () => {
      expect(() => query.validate({ kuery: 123 })).toThrowError();
    });

    it('should reject kuery longer than 30000 characters', () => {
      const longKuery = 'a'.repeat(30001);
      expect(() => query.validate({ kuery: longKuery })).toThrowError();
    });

    it('should accept kuery exactly 30000 characters long', () => {
      const maxKuery = 'a'.repeat(30000);
      expect(query.validate({ kuery: maxKuery })).toEqual({
        page: ENDPOINT_DEFAULT_PAGE,
        pageSize: ENDPOINT_DEFAULT_PAGE_SIZE,
        kuery: maxKuery,
      });
    });

    it('should work with valid hostStatus', () => {
      const queryParams = { hostStatuses: [HostStatus.HEALTHY, HostStatus.UPDATING] };
      const expected = {
        page: ENDPOINT_DEFAULT_PAGE,
        pageSize: ENDPOINT_DEFAULT_PAGE_SIZE,
        ...queryParams,
      };
      expect(query.validate(queryParams)).toEqual(expected);
    });

    it('should throw if invalid hostStatus', () => {
      expect(() =>
        query.validate({ hostStatuses: [HostStatus.UNHEALTHY, 'invalidstatus'] })
      ).toThrowError();
    });
  });
});
