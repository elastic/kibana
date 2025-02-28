/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';

export const conditionalAddLabels = (labels: agent.Labels, stringify?: boolean | undefined) => {
  if (agent.isStarted()) {
    agent.addLabels(labels, stringify);
  }
};

export const conditionalSetCustomContext = (custom: object) => {
  if (agent.isStarted()) {
    agent.setCustomContext(custom);
  }
};
