/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getSimpleQuery = () => {
  return {
    query: {
      bool: {
        should: [{ match_all: {} }],
      },
    },
  };
};

export const getSimpleDetectionAlertsQuery = () => {
  return {
    query: {
      bool: {
        must_not: {
          exists: {
            field: 'kibana.alert.attack_discovery.alert_ids',
          },
        },
      },
    },
  };
};

export const getSimpleAttackAlertsQuery = () => {
  return {
    query: {
      exists: {
        field: 'kibana.alert.attack_discovery.alert_ids',
      },
    },
  };
};
