/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsCollection } from '../../../../common/types/analytics';
import { KibanaLogic } from '../../shared/kibana/kibana_logic';

export const findOrCreateDataView = async (collection: AnalyticsCollection) => {
  if (!KibanaLogic.values.data) {
    return null;
  }
  const dataView = (
    await KibanaLogic.values.data.dataViews.find(collection.events_datastream, 1)
  ).find((result) => result.title === collection.events_datastream);

  if (dataView) {
    return dataView;
  }

  return await KibanaLogic.values.data.dataViews.createAndSave(
    {
      allowNoIndex: true,
      name: `behavioral_analytics.events-${collection.name}`,
      timeFieldName: '@timestamp',
      title: collection.events_datastream,
    },
    true
  );
};
