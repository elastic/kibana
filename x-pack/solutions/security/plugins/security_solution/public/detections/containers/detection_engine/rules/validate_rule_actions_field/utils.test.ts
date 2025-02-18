/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { getActionTypeName, validateMustache, validateActionParams } from './utils';

describe('stepRuleActions utils', () => {
  describe('getActionTypeName', () => {
    it('should return capitalized action type name', () => {
      expect(getActionTypeName('.slack')).toEqual('Slack');
    });

    it('should return empty string actionTypeId had improper format', () => {
      expect(getActionTypeName('slack')).toEqual('');
    });
  });

  describe('validateMustache', () => {
    it('should validate mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{variable}}',
        })
      ).toHaveLength(0);
    });

    it('should validate incorrect mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{{variable}}',
        })
      ).toHaveLength(1);
    });
  });

  describe('validateActionParams', () => {
    const validateParamsMock = jest.fn();
    const actionTypeRegistry = actionTypeRegistryMock.create();

    beforeAll(() => {
      const actionMock = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'id',
        iconClass: 'iconClass',
        validateParams: validateParamsMock,
        selectMessage: 'message',
      });
      actionTypeRegistry.get.mockReturnValue(actionMock);
    });

    it('should validate action params', async () => {
      validateParamsMock.mockReturnValue({ errors: [] });

      expect(
        await validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {
              message: 'Message',
            },
          },
          actionTypeRegistry
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params', async () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required'],
      });

      expect(
        await validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(1);
    });

    it('should validate incorrect action params and filter error objects', async () => {
      validateParamsMock.mockReturnValue({
        errors: [
          {
            message: 'Message is required',
          },
        ],
      });

      expect(
        await validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params and filter duplicated errors', async () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required', 'Message is required', 'Message is required'],
      });

      expect(
        await validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(1);
    });
  });
});
