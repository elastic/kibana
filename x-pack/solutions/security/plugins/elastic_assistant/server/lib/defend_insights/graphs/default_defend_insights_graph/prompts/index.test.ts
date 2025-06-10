/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DefendInsightsCombinedPrompts,
  getIncompatibleAntivirusPrompt,
} from './incompatible_antivirus';
import { getDefendInsightsPrompt } from '.';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

jest.mock('./incompatible_antivirus', () => ({
  getIncompatibleAntivirusPrompt: jest.fn(),
}));

describe('getDefendInsightsPrompt', () => {
  const mockArgs = {
    actionsClient: {} as unknown as PublicMethodsOf<ActionsClient>,
    connector: undefined,
    connectorId: 'mock-connector-id',
    model: 'mock-model',
    provider: 'mock-provider',
    savedObjectsClient: {} as unknown as SavedObjectsClientContract,
  };

  it('should call getIncompatibleAntivirusPrompt for incompatible_antivirus type', async () => {
    const mockResponse: DefendInsightsCombinedPrompts = {
      default: 'default prompt',
      refine: 'refine prompt',
      continue: 'continue prompt',
      group: 'group value',
      events: 'events value',
      eventsId: 'events id',
      eventsEndpointId: 'endpoint id',
      eventsValue: 'events value content',
    };
    (getIncompatibleAntivirusPrompt as jest.Mock).mockResolvedValue(mockResponse);

    const result = await getDefendInsightsPrompt({
      type: DefendInsightType.Enum.incompatible_antivirus,
      ...mockArgs,
    });

    expect(getIncompatibleAntivirusPrompt).toHaveBeenCalledWith(mockArgs);
    expect(result).toBe(mockResponse);
  });

  it('should throw InvalidDefendInsightTypeError for unsupported types', async () => {
    const invalidType = 'some_invalid_type' as DefendInsightType;

    try {
      await getDefendInsightsPrompt({ type: invalidType, ...mockArgs });
      fail('Expected error to be thrown');
    } catch (err) {
      expect(err.message).toBe('invalid defend insight type');
      expect(err.constructor.name).toBe('InvalidDefendInsightTypeError');
    }
  });
});
