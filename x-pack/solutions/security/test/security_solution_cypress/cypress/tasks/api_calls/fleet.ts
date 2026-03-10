/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from './common';

/**
 * Deletes all existing Fleet packages, package policies and agent policies.
 */
export const cleanFleet = () => {
  // NOTE: order does matter.
  return deletePackagePolicies()
    .then(() => {
      deletePackages();
    })
    .then(() => {
      deleteAgentPolicies();
    });
};

const deleteAgentPolicies = () => {
  return rootRequest<{ items: Array<{ id: string }> }>({
    method: 'GET',
    url: 'api/fleet/agent_policies',
  }).then((response) => {
    response.body.items.forEach((item: { id: string }) => {
      rootRequest({
        method: 'POST',
        url: `api/fleet/agent_policies/delete`,
        body: {
          agentPolicyId: item.id,
        },
      });
    });
  });
};

const deletePackagePolicies = () => {
  return rootRequest<{ items: Array<{ id: string }> }>({
    method: 'GET',
    url: 'api/fleet/package_policies',
  }).then((response) => {
    rootRequest({
      method: 'POST',
      url: `api/fleet/package_policies/delete`,
      body: {
        packagePolicyIds: response.body.items.map((item: { id: string }) => item.id),
      },
    });
  });
};

const deletePackages = () => {
  return rootRequest<{ items: Array<{ status: string; name: string; version: string }> }>({
    method: 'GET',
    url: 'api/fleet/epm/packages',
  }).then((response) => {
    response.body.items.forEach((item) => {
      if (item.status === 'installed') {
        rootRequest({
          method: 'DELETE',
          url: `api/fleet/epm/packages/${item.name}/${item.version}`,
        });
      }
    });
  });
};
