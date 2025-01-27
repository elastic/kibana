/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { Connector, CONNECTORS_INDEX } from '@kbn/search-connectors';

import { updateHtmlExtraction } from './put_html_extraction';

describe('updateHtmlExtraction lib function', () => {
  const mockClient = {
    asCurrentUser: {
      update: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update connector configuration', async () => {
    mockClient.asCurrentUser.update.mockResolvedValue(true);
    const mockConnector = {
      configuration: { test: { label: 'haha', value: 'this' } },
      id: 'connectorId',
    };

    await updateHtmlExtraction(
      mockClient as unknown as IScopedClusterClient,
      true,
      mockConnector as any as Connector
    );
    expect(mockClient.asCurrentUser.update).toHaveBeenCalledWith({
      doc: {
        configuration: {
          ...mockConnector.configuration,
          extract_full_html: { label: 'Extract full HTML', value: true },
        },
      },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
  });
});
