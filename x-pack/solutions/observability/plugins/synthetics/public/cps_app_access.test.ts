/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';
import { getSyntheticsProjectPickerAccess } from './cps_app_access';

describe('getSyntheticsProjectPickerAccess', () => {
  it.each([
    '/app/synthetics',
    '/app/synthetics/',
    '/s/obs/app/synthetics/certificates',
    '/app/synthetics/monitor/abc',
    '/app/synthetics/errors',
    '/app/synthetics/journey/check-1/steps',
  ])('is editable on read surfaces: %s', (location) => {
    expect(getSyntheticsProjectPickerAccess(location)).toBe(ProjectRoutingAccess.EDITABLE);
  });

  it.each([
    '/app/synthetics/add-monitor',
    '/app/synthetics/edit-monitor/abc',
    '/app/synthetics/settings',
    '/app/synthetics/settings/private-locations',
    '/s/obs/app/synthetics/manage-monitors',
  ])('is disabled on write surfaces: %s', (location) => {
    expect(getSyntheticsProjectPickerAccess(location)).toBe(ProjectRoutingAccess.DISABLED);
  });
});
