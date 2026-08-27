/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { SloToolValidationError } from './errors';
import { assertPlatinumLicenseForTools } from './license';

const createGetLicensing =
  (start: LicensingPluginStart) => async (): Promise<LicensingPluginStart> =>
    start;

describe('assertPlatinumLicenseForTools', () => {
  it('resolves when the license is platinum', async () => {
    const licensing = licensingMock.createStart();
    const license = licensingMock.createLicenseMock();
    license.hasAtLeast.mockReturnValue(true);
    licensing.getLicense.mockResolvedValue(license);

    await expect(assertPlatinumLicenseForTools(createGetLicensing(licensing))).resolves.toBeUndefined();
  });

  it('resolves when the license is trial', async () => {
    const licensing = licensingMock.createStart();
    const license = licensingMock.createLicenseMock();
    license.hasAtLeast.mockReturnValue(true);
    licensing.getLicense.mockResolvedValue(license);

    await expect(assertPlatinumLicenseForTools(createGetLicensing(licensing))).resolves.toBeUndefined();
  });

  it('throws SloToolValidationError when the license is basic', async () => {
    const licensing = licensingMock.createStart();
    const license = licensingMock.createLicenseMock();
    license.hasAtLeast.mockReturnValue(false);
    licensing.getLicense.mockResolvedValue(license);

    await expect(assertPlatinumLicenseForTools(createGetLicensing(licensing))).rejects.toThrow(
      SloToolValidationError
    );
  });

  it('throws with the expected message when license is insufficient', async () => {
    const licensing = licensingMock.createStart();
    const license = licensingMock.createLicenseMock();
    license.hasAtLeast.mockReturnValue(false);
    licensing.getLicense.mockResolvedValue(license);

    await expect(assertPlatinumLicenseForTools(createGetLicensing(licensing))).rejects.toThrow(
      'Platinum license or higher is needed to make use of this feature.'
    );
  });
});
