/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDestinationLayer, getLayerList, getLineLayer, getSourceLayer, lmc } from './map_config';
import {
  mockAPMIndexPatternIds,
  mockClientLayer,
  mockClientServerLineLayer,
  mockDestinationLayer,
  mockIndexPatternIds,
  mockLayerList,
  mockLayerListDouble,
  mockLayerListMixed,
  mockLayerGroup,
  mockLineLayer,
  mockServerLayer,
  mockSourceLayer,
  mockEuiTheme,
} from './__mocks__/mock';

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuidv1()'),
    v4: jest.fn(() => 'uuidv4()'),
  };
});

const layerProviderDependencies = { euiTheme: mockEuiTheme };

describe('map_config', () => {
  describe('#getLayerList', () => {
    test('it returns the complete layerList with a source, destination, and line layer', () => {
      const layerList = getLayerList(layerProviderDependencies, mockIndexPatternIds);
      expect(layerList).toStrictEqual(mockLayerList);
    });

    test('it returns the complete layerList for multiple indices', () => {
      const layerList = getLayerList(layerProviderDependencies, [
        ...mockIndexPatternIds,
        ...mockIndexPatternIds,
      ]);
      expect(layerList).toStrictEqual(mockLayerListDouble);
    });

    test('it returns the complete layerList for multiple indices with custom layer mapping', () => {
      const layerList = getLayerList(layerProviderDependencies, [
        ...mockIndexPatternIds,
        ...mockAPMIndexPatternIds,
      ]);
      expect(layerList).toStrictEqual(mockLayerListMixed);
    });
  });

  describe('#getSourceLayer', () => {
    test('it returns a source layer', () => {
      const layerList = getSourceLayer(
        layerProviderDependencies,
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc.default.source
      );
      expect(layerList).toStrictEqual(mockSourceLayer);
    });

    test('it returns a source layer for custom layer mapping', () => {
      const layerList = getSourceLayer(
        layerProviderDependencies,
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc[mockAPMIndexPatternIds[0].title].source
      );
      expect(layerList).toStrictEqual(mockClientLayer);
    });
  });

  describe('#getDestinationLayer', () => {
    test('it returns a destination layer', () => {
      const layerList = getDestinationLayer(
        layerProviderDependencies,
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc.default.destination
      );
      expect(layerList).toStrictEqual(mockDestinationLayer);
    });

    test('it returns a destination layer for custom layer mapping', () => {
      const layerList = getDestinationLayer(
        layerProviderDependencies,
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc[mockAPMIndexPatternIds[0].title].destination
      );
      expect(layerList).toStrictEqual(mockServerLayer);
    });
  });

  describe('#getLineLayer', () => {
    test('it returns a line layer', () => {
      const layerList = getLineLayer(
        mockIndexPatternIds[0].title,
        mockIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc.default
      );
      expect(layerList).toStrictEqual(mockLineLayer);
    });

    test('it returns a line layer for custom layer mapping', () => {
      const layerList = getLineLayer(
        mockAPMIndexPatternIds[0].title,
        mockAPMIndexPatternIds[0].id,
        mockLayerGroup.id,
        lmc[mockAPMIndexPatternIds[0].title]
      );
      expect(layerList).toStrictEqual(mockClientServerLineLayer);
    });
  });
});
