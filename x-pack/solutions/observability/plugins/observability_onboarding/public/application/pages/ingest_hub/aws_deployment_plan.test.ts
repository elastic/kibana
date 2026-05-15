/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_SERVICES_VERSION1_MATRIX, AWS_VERSION1_LOGS_SERVICE_IDS } from './aws_services_data';
import { buildAwsDeploymentPlan } from './aws_deployment_plan';

describe('buildAwsDeploymentPlan', () => {
  it('partitions all Version 1 log services without throwing', () => {
    const plan = buildAwsDeploymentPlan(new Set(AWS_VERSION1_LOGS_SERVICE_IDS));
    expect(plan.lanes.length).toBeGreaterThan(0);
    const assigned = new Set(plan.lanes.flatMap((lane) => lane.serviceIds));
    for (const serviceId of AWS_VERSION1_LOGS_SERVICE_IDS) {
      expect(assigned.has(serviceId) || plan.unmappedServiceIds.includes(serviceId)).toBe(true);
    }
  });

  it('partitions the full Version 1 catalog without throwing', () => {
    const allIds = AWS_SERVICES_VERSION1_MATRIX.map((service) => service.id);
    const plan = buildAwsDeploymentPlan(new Set(allIds));
    expect(plan.lanes.length).toBeGreaterThan(0);
    const assigned = new Set(plan.lanes.flatMap((lane) => lane.serviceIds));
    for (const serviceId of allIds) {
      expect(assigned.has(serviceId) || plan.unmappedServiceIds.includes(serviceId)).toBe(true);
    }
  });
});
