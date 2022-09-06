/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MapsHelper({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['maps', 'common']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  return {
    async toggleLayerVisibility(layerName: string) {
      log.debug('Inside toggleLayerVisibility');
      await PageObjects.maps.openLayerTocActionsPanel(layerName);
      await testSubjects.click('layerVisibilityToggleButton');
      await PageObjects.common.sleep(3000);
      const isTooltipOpen = await testSubjects.exists(`layerTocTooltip`, { timeout: 5000 });
      if (isTooltipOpen) {
        await testSubjects.click(`layerTocTooltip`);
        await PageObjects.common.sleep(1000);
      }
    },

    // In v8.0, the default base map switched from bright to desaturated.
    // https://github.com/elastic/kibana/pull/116179
    // Maps created before this change will have a base map called "Road map"
    // Maps created after this change will have a base map called "Road map - desaturated"
    // toggleLayerVisibilityRoadMap will toggle layer visibility for either value
    async toggleLayerVisibilityRoadMap() {
      const isRoadMapDesaturated = await testSubjects.exists(
        'layerTocActionsPanelToggleButtonRoad_map_-_desaturated'
      );
      const isRoadMap = await testSubjects.exists('layerTocActionsPanelToggleButtonRoad_map');
      if (!isRoadMapDesaturated && !isRoadMap) {
        throw new Error('Layer road map not found');
      }
      if (isRoadMapDesaturated) {
        await this.toggleLayerVisibility('Road map - desaturated');
      }
      if (isRoadMap) {
        await this.toggleLayerVisibility('Road map');
      }
    },

    // In v7.16, e-commerce sample data was re-worked so that geo.src field to match country code of geo.coordinates
    // https://github.com/elastic/kibana/pull/110885
    // Maps created before this change will have a layer called "Total Requests by Country"
    // Maps created after this change will have a layer called "Total Requests by Destination"
    // toggleLayerVisibilityTotalRequests will toggle layer visibility for either value
    async toggleLayerVisibilityTotalRequests() {
      const isRequestByCountry = await testSubjects.exists(
        'layerTocActionsPanelToggleButtonTotal_Requests_by_Country'
      );
      const isRequestByDestination = await testSubjects.exists(
        'layerTocActionsPanelToggleButtonTotal_Requests_by_Destination'
      );
      if (!isRequestByCountry && !isRequestByDestination) {
        throw new Error('Layer total requests not found');
      }
      if (isRequestByCountry) {
        await PageObjects.maps.toggleLayerVisibility('Total Requests by Country');
      }
      if (isRequestByDestination) {
        await PageObjects.maps.toggleLayerVisibility('Total Requests by Destination');
      }
    },
  };
}

export const services = {
  mapsHelper: MapsHelper,
};
