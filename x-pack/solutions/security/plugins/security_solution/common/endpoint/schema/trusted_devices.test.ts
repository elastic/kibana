/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetTrustedDevicesRequestSchema,
  GetTrustedDevicesSummaryRequestSchema,
  PostTrustedDeviceCreateRequestSchema,
  PutTrustedDeviceUpdateRequestSchema,
} from './trusted_devices';
import { OperatingSystem, TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type {
  TrustedDeviceConditionEntry,
  PutTrustedDevicesRequestParams,
  NewTrustedDevice,
} from '../types';

describe('When invoking Trusted Devices Schema', () => {
  describe('for GET List', () => {
    const getListQueryParams = (page: unknown = 1, perPage: unknown = 20) => ({
      page,
      per_page: perPage,
    });
    const query = GetTrustedDevicesRequestSchema.query;

    describe('query param validation', () => {
      it('should return query params if valid', () => {
        expect(query.validate(getListQueryParams())).toEqual({
          page: 1,
          per_page: 20,
        });
      });

      it('should use default values', () => {
        expect(query.validate(getListQueryParams(undefined, undefined))).toEqual({
          page: 1,
          per_page: 20,
        });
        expect(query.validate(getListQueryParams(undefined, 100))).toEqual({
          page: 1,
          per_page: 100,
        });
        expect(query.validate(getListQueryParams(10, undefined))).toEqual({
          page: 10,
          per_page: 20,
        });
      });

      it('should throw if `page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams('one'));
        }).toThrowError();
      });

      it('should throw if `page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(-1));
        }).toThrowError();
      });

      it('should throw if `per_page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 'twenty'));
        }).toThrowError();
      });

      it('should throw if `per_page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(1, -1));
        }).toThrowError();
      });
    });
  });

  describe('for GET Summary', () => {
    const getListQueryParams = (kuery?: string) => ({ kuery });
    const query = GetTrustedDevicesSummaryRequestSchema.query;

    describe('query param validation', () => {
      it('should return query params if valid without kuery', () => {
        expect(query.validate(getListQueryParams())).toEqual({});
      });

      it('should return query params if valid with kuery', () => {
        const kuery = `exception-list-agnostic.attributes.tags:"policy:caf1a334-53f3-4be9-814d-a32245f43d34" OR exception-list-agnostic.attributes.tags:"policy:all"`;
        expect(query.validate(getListQueryParams(kuery))).toEqual({ kuery });
      });
    });
  });

  describe('for POST Create', () => {
    const createConditionEntry = <T>(data?: T): TrustedDeviceConditionEntry => ({
      field: TrustedDeviceConditionEntryField.HOST,
      type: 'match',
      operator: 'included',
      value: 'DESKTOP-TEST-PC',
      ...(data || {}),
    });
    const createNewTrustedDevice = <T>(data?: T): NewTrustedDevice =>
      ({
        name: 'Test Device',
        description: 'this device is trusted',
        os: OperatingSystem.WINDOWS,
        effectScope: { type: 'global' },
        entries: [createConditionEntry()],
        ...(data || {}),
      } as NewTrustedDevice);
    const body = PostTrustedDeviceCreateRequestSchema.body;

    it('should not error on a valid message', () => {
      const bodyMsg = createNewTrustedDevice();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `name` is required', () => {
      expect(() => body.validate(createNewTrustedDevice({ name: undefined }))).toThrow();
    });

    it('should validate `name` value to be non-empty', () => {
      expect(() => body.validate(createNewTrustedDevice({ name: '' }))).toThrow();
    });

    it('should validate `description` as optional', () => {
      const { description, ...bodyMsg } = createNewTrustedDevice();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `os` to only accept known values', () => {
      const bodyMsg = createNewTrustedDevice({ os: undefined });
      expect(() => body.validate(bodyMsg)).toThrow();

      expect(() => body.validate({ ...bodyMsg, os: '' })).toThrow();

      expect(() => body.validate({ ...bodyMsg, os: 'winz' })).toThrow();

      // Only Windows and macOS are supported (no Linux)
      [OperatingSystem.MAC, OperatingSystem.WINDOWS].forEach((os) => {
        expect(() => body.validate({ ...bodyMsg, os })).not.toThrow();
      });

      // Linux should NOT be supported
      expect(() => body.validate({ ...bodyMsg, os: OperatingSystem.LINUX })).toThrow();
    });

    it('should validate `entries` as required', () => {
      expect(() => body.validate(createNewTrustedDevice({ entries: undefined }))).toThrow();

      const { entries, ...bodyMsg2 } = createNewTrustedDevice();
      expect(() => body.validate(bodyMsg2)).toThrow();
    });

    it('should validate `entries` to have at least 1 item', () => {
      expect(() => body.validate(createNewTrustedDevice({ entries: [] }))).toThrow();
    });

    describe('when `entries` are defined', () => {
      it('should validate `entry.field` is required', () => {
        const { field, ...entry } = createConditionEntry();
        expect(() => body.validate(createNewTrustedDevice({ entries: [entry] }))).toThrow();
      });

      it('should validate `entry.field` does not accept empty values', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [createConditionEntry({ field: '' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.field` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [createConditionEntry({ field: 'invalid_field' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.field` accepts all trusted device field names', () => {
        [
          TrustedDeviceConditionEntryField.USERNAME,
          TrustedDeviceConditionEntryField.HOST,
          TrustedDeviceConditionEntryField.DEVICE_ID,
          TrustedDeviceConditionEntryField.MANUFACTURER,
          TrustedDeviceConditionEntryField.PRODUCT_ID,
          TrustedDeviceConditionEntryField.PRODUCT_NAME,
          TrustedDeviceConditionEntryField.DEVICE_TYPE,
          TrustedDeviceConditionEntryField.MANUFACTURER_ID,
        ].forEach((field) => {
          const bodyMsg = createNewTrustedDevice({
            entries: [createConditionEntry({ field, value: 'test-value' })],
          });

          expect(() => body.validate(bodyMsg)).not.toThrow();
        });
      });

      it('should validate `entry.type` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [createConditionEntry({ type: 'invalid' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.type` accepts known values', () => {
        ['match', 'wildcard'].forEach((type) => {
          const bodyMsg = createNewTrustedDevice({
            entries: [createConditionEntry({ type })],
          });
          expect(() => body.validate(bodyMsg)).not.toThrow();
        });
      });

      it('should validate `entry.operator` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [createConditionEntry({ operator: 'invalid' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.operator` accepts known values', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [createConditionEntry({ operator: 'included' })],
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should validate `entry.value` required', () => {
        const { value, ...entry } = createConditionEntry();
        expect(() => body.validate(createNewTrustedDevice({ entries: [entry] }))).toThrow();
      });

      it('should validate `entry.value` is non-empty', () => {
        const bodyMsg = createNewTrustedDevice({ entries: [createConditionEntry({ value: '' })] });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate that duplicate fields are not allowed', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [
            createConditionEntry({ field: TrustedDeviceConditionEntryField.HOST }),
            createConditionEntry({ field: TrustedDeviceConditionEntryField.HOST }),
          ],
        });
        expect(() => body.validate(bodyMsg)).toThrow(/duplicatedEntry/);
      });

      it('should allow different fields in the same entry', () => {
        const bodyMsg = createNewTrustedDevice({
          entries: [
            createConditionEntry({ field: TrustedDeviceConditionEntryField.HOST, value: 'HOST1' }),
            createConditionEntry({
              field: TrustedDeviceConditionEntryField.USERNAME,
              value: 'user1',
            }),
            createConditionEntry({
              field: TrustedDeviceConditionEntryField.DEVICE_ID,
              value: 'device123',
            }),
          ],
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });
    });

    describe('effectScope validation', () => {
      it('should validate global effect scope', () => {
        const bodyMsg = createNewTrustedDevice({
          effectScope: { type: 'global' },
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should validate policy effect scope with policies array', () => {
        const bodyMsg = createNewTrustedDevice({
          effectScope: {
            type: 'policy',
            policies: ['policy-1', 'policy-2'],
          },
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should reject policy effect scope without policies array', () => {
        const bodyMsg = createNewTrustedDevice({
          effectScope: { type: 'policy' },
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });
    });
  });

  describe('for PUT Update', () => {
    const createConditionEntry = <T>(data?: T): TrustedDeviceConditionEntry => ({
      field: TrustedDeviceConditionEntryField.HOST,
      type: 'match',
      operator: 'included',
      value: 'DESKTOP-TEST-PC',
      ...(data || {}),
    });
    const createNewTrustedDevice = <T>(data?: T): NewTrustedDevice =>
      ({
        name: 'Test Device',
        description: 'this device is trusted',
        os: OperatingSystem.WINDOWS,
        effectScope: { type: 'global' },
        entries: [createConditionEntry()],
        ...(data || {}),
      } as NewTrustedDevice);

    const updateParams = <T>(data?: T): PutTrustedDevicesRequestParams => ({
      id: 'validId',
      ...(data || {}),
    });

    const body = PutTrustedDeviceUpdateRequestSchema.body;
    const params = PutTrustedDeviceUpdateRequestSchema.params;

    it('should not error on a valid message', () => {
      const bodyMsg = createNewTrustedDevice();
      const paramsMsg = updateParams();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
      expect(params.validate(paramsMsg)).toStrictEqual(paramsMsg);
    });

    it('should validate `id` params is required', () => {
      expect(() => params.validate(updateParams({ id: undefined }))).toThrow();
    });

    it('should validate `id` params to be string', () => {
      expect(() => params.validate(updateParams({ id: 1 }))).toThrow();
    });

    it('should validate `version`', () => {
      const bodyMsg = createNewTrustedDevice({ version: 'v1' });
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `version` must be string', () => {
      const bodyMsg = createNewTrustedDevice({ version: 1 });
      expect(() => body.validate(bodyMsg)).toThrow();
    });
  });
});
