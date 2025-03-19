/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { License } from '@kbn/licensing-plugin/common/license';

import {
  hasEnterpriseLicense,
  hasGoldLicense,
  hasPlatinumLicense,
  isTrialLicense,
} from './licensing';

describe('licensing utils', () => {
  const basicLicense = licenseMock.createLicense();
  const basicExpiredLicense = licenseMock.createLicense({ license: { status: 'expired' } });
  const goldLicense = licenseMock.createLicense({ license: { type: 'gold' } });
  const goldLicenseExpired = licenseMock.createLicense({
    license: { status: 'expired', type: 'gold' },
  });
  const platinumLicense = licenseMock.createLicense({ license: { type: 'platinum' } });
  const platinumLicenseExpired = licenseMock.createLicense({
    license: { status: 'expired', type: 'platinum' },
  });
  const enterpriseLicense = licenseMock.createLicense({ license: { type: 'enterprise' } });
  const enterpriseLicenseExpired = licenseMock.createLicense({
    license: { status: 'expired', type: 'enterprise' },
  });
  const trialLicense = licenseMock.createLicense({ license: { type: 'trial' } });
  const trialLicenseExpired = licenseMock.createLicense({
    license: { status: 'expired', type: 'trial' },
  });

  const errorMessage = 'unavailable';
  const errorLicense = new License({ error: errorMessage, signature: '' });
  const unavailableLicense = new License({ signature: '' });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('hasEnterpriseLicense', () => {
    it('returns true for active valid licenses', () => {
      expect(hasEnterpriseLicense(enterpriseLicense)).toEqual(true);
      expect(hasEnterpriseLicense(trialLicense)).toEqual(true);
    });
    it('returns false for active invalid licenses', () => {
      expect(hasEnterpriseLicense(basicLicense)).toEqual(false);
      expect(hasEnterpriseLicense(goldLicense)).toEqual(false);
      expect(hasEnterpriseLicense(platinumLicense)).toEqual(false);
    });
    it('returns false for inactive licenses', () => {
      expect(hasEnterpriseLicense(trialLicenseExpired)).toEqual(false);
      expect(hasEnterpriseLicense(enterpriseLicenseExpired)).toEqual(false);
      expect(hasEnterpriseLicense(basicExpiredLicense)).toEqual(false);
    });
    it('returns false for unavailable license', () => {
      expect(hasEnterpriseLicense(errorLicense)).toEqual(false);
      expect(hasEnterpriseLicense(unavailableLicense)).toEqual(false);
    });
    it('returns false for null license', () => {
      expect(hasEnterpriseLicense(null)).toEqual(false);
    });
    it('returns false for undefined license', () => {
      expect(hasEnterpriseLicense(undefined)).toEqual(false);
    });
  });

  describe('hasPlatinumLicense', () => {
    it('returns true for valid active licenses', () => {
      expect(hasPlatinumLicense(platinumLicense)).toEqual(true);
      expect(hasPlatinumLicense(enterpriseLicense)).toEqual(true);
      expect(hasPlatinumLicense(trialLicense)).toEqual(true);
    });
    it('returns false for invalid active licenses', () => {
      expect(hasPlatinumLicense(goldLicense)).toEqual(false);
      expect(hasPlatinumLicense(basicLicense)).toEqual(false);
    });
    it('returns false for inactive licenses', () => {
      expect(hasPlatinumLicense(platinumLicenseExpired)).toEqual(false);
      expect(hasPlatinumLicense(enterpriseLicenseExpired)).toEqual(false);
      expect(hasPlatinumLicense(trialLicenseExpired)).toEqual(false);
    });
    it('returns false for bad licenses', () => {
      expect(hasPlatinumLicense(errorLicense)).toEqual(false);
      expect(hasPlatinumLicense(unavailableLicense)).toEqual(false);
    });
    it('returns false for null license', () => {
      expect(hasPlatinumLicense(null)).toEqual(false);
    });
    it('returns false for undefined license', () => {
      expect(hasPlatinumLicense(undefined)).toEqual(false);
    });
  });
  describe('hasGoldLicense', () => {
    it('returns true for valid active licenses', () => {
      expect(hasGoldLicense(goldLicense)).toEqual(true);
      expect(hasGoldLicense(platinumLicense)).toEqual(true);
      expect(hasGoldLicense(enterpriseLicense)).toEqual(true);
      expect(hasGoldLicense(trialLicense)).toEqual(true);
    });
    it('returns false for invalid active licenses', () => {
      expect(hasGoldLicense(basicLicense)).toEqual(false);
    });
    it('returns false for inactive licenses', () => {
      expect(hasGoldLicense(goldLicenseExpired)).toEqual(false);
      expect(hasGoldLicense(platinumLicenseExpired)).toEqual(false);
      expect(hasGoldLicense(enterpriseLicenseExpired)).toEqual(false);
      expect(hasGoldLicense(trialLicenseExpired)).toEqual(false);
    });
    it('returns false for bad licenses', () => {
      expect(hasGoldLicense(errorLicense)).toEqual(false);
      expect(hasGoldLicense(unavailableLicense)).toEqual(false);
    });
    it('returns false for null license', () => {
      expect(hasGoldLicense(null)).toEqual(false);
    });
    it('returns false for undefined license', () => {
      expect(hasGoldLicense(undefined)).toEqual(false);
    });
  });
  describe('isTrialLicense', () => {
    it('returns true for active trial license', () => {
      expect(hasGoldLicense(trialLicense)).toEqual(true);
    });
    it('returns false for non-trial license', () => {
      expect(isTrialLicense(platinumLicense)).toEqual(false);
    });
    it('returns false for invalid license', () => {
      expect(isTrialLicense(trialLicenseExpired)).toEqual(false);
      expect(isTrialLicense(errorLicense)).toEqual(false);
      expect(isTrialLicense(unavailableLicense)).toEqual(false);
    });
    it('returns false for null license', () => {
      expect(isTrialLicense(null)).toEqual(false);
    });
    it('returns false for undefined license', () => {
      expect(isTrialLicense(undefined)).toEqual(false);
    });
  });
});
