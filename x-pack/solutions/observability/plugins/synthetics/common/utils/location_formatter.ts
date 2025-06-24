/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivateLocation, ServiceLocation } from '../runtime_types';

export const formatLocation = (location: ServiceLocation | PrivateLocation) => {
  if ('agentPolicyId' in location) {
    return {
      id: location.id,
      label: location.label,
      geo: location.geo,
      isServiceManaged: location.isServiceManaged,
      agentPolicyId: location.agentPolicyId,
    };
  }

  return {
    id: location.id,
    label: location.label,
    geo: location.geo,
    isServiceManaged: location.isServiceManaged,
  };
};
