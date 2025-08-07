/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorNameFromId } from '.';
import { getMockConnectors } from '../../mock/mock_connectors';

describe('getConnectorNameFromId', () => {
  const mockAIConnectors = getMockConnectors();
  const mockConnectorId = mockAIConnectors[0].id; // Use an ID from the mock connectors
  const mockConnectorName = mockAIConnectors[0].name; // Corresponding name

  it('returns the name of the connector when found', () => {
    const result = getConnectorNameFromId({
      aiConnectors: mockAIConnectors,
      connectorId: mockConnectorId,
    });

    expect(result).toBe(mockConnectorName);
  });

  it('returns undefined when aiConnectors is undefined', () => {
    const result = getConnectorNameFromId({
      aiConnectors: undefined,
      connectorId: mockConnectorId,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when connectorId is undefined', () => {
    const result = getConnectorNameFromId({
      aiConnectors: mockAIConnectors,
      connectorId: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the connector is not found', () => {
    const result = getConnectorNameFromId({
      aiConnectors: mockAIConnectors,
      connectorId: 'non-existent-id',
    });

    expect(result).toBeUndefined();
  });
});
