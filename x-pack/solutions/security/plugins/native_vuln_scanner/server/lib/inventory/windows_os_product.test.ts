/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseWindowsArch, resolveWindowsOsProduct } from './windows_os_product';

// The three rows below are real `os_version` rows, verbatim.
const win10 = {
  arch: '64 bits',
  build: '19045',
  codename: 'Microsoft Windows 10 Professionnel',
  install_date: '1795477407',
  major: '10',
  minor: '0',
  name: 'Microsoft Windows 10 Professionnel',
  patch: '',
  platform: 'windows',
  platform_like: 'windows',
  revision: '4651',
  version: '10.0.19045',
};
const server2022 = {
  ...win10,
  arch: '64-bit',
  build: '20348',
  codename: 'Microsoft Windows Server 2022 Datacenter',
  name: 'Microsoft Windows Server 2022 Datacenter',
  revision: '5386',
  version: '10.0.20348',
};
const server2025 = {
  ...server2022,
  build: '26100',
  codename: 'Microsoft Windows Server 2025 Datacenter',
  name: 'Microsoft Windows Server 2025 Datacenter',
  revision: '33828',
  version: '10.0.26100',
};

const productId = (row: Record<string, unknown>): string | undefined => {
  const result = resolveWindowsOsProduct(row);
  return result.ok ? result.product.productId : undefined;
};

const reason = (row: Record<string, unknown>): string => {
  const result = resolveWindowsOsProduct(row);
  if (result.ok) throw new Error(`expected a failure, got ${result.product.productId}`);
  return result.reason;
};

describe('resolveWindowsOsProduct', () => {
  it.each([
    ['Windows 10 22H2 (French, "64 bits")', win10, '12097'],
    ['Windows Server 2022', server2022, '11923'],
    ['Windows Server 2025', server2025, '12436'],
  ])('maps the real os_version row for %s to product %s', (_label, row, expected) => {
    expect(productId(row)).toBe(expected);
  });

  it('gives the build to compare against an advisory', () => {
    expect(resolveWindowsOsProduct(win10)).toEqual({
      ok: true,
      product: {
        productId: '12097',
        arch: 'x64',
        build: 19045,
        ubr: 4651,
        installedBuild: '10.0.19045.4651',
        label: 'Windows 10 22H2',
      },
    });
  });

  describe('architecture strings', () => {
    it.each([
      ['64-bit', '12097'],
      ['64 bits', '12097'],
      ['ARM 64-bit Processor', '12098'],
      ['32-bit', '12099'],
      ['x86', '12099'],
    ])('%j on Windows 10 22H2 is product %s', (arch, expected) => {
      expect(productId({ ...win10, arch })).toBe(expected);
    });

    it.each([[''], [undefined], ['Itanium'], ['bits']])('%j is unsupported_os', (arch) => {
      expect(reason({ ...win10, arch })).toMatch(/architecture/);
    });

    it('reads ARM before the 64 it contains', () => {
      expect(parseWindowsArch('ARM 64-bit Processor')).toBe('arm64');
      expect(parseWindowsArch('arm64')).toBe('arm64');
      expect(parseWindowsArch('64-bit')).toBe('x64');
      expect(parseWindowsArch('')).toBeUndefined();
    });
  });

  describe('build 26100 is Windows 11 24H2 or Windows Server 2025, told apart by UBR', () => {
    it('picks Server 2025 from a UBR of 30000 and above', () => {
      expect(productId({ ...server2025, revision: '30000' })).toBe('12436');
      expect(productId({ ...server2025, revision: '33828' })).toBe('12436');
    });

    it('picks Windows 11 24H2 below 30000', () => {
      const win11 = { ...server2025, name: 'Microsoft Windows 11 Pro', revision: '8875' };
      expect(productId(win11)).toBe('12390');
      expect(productId({ ...win11, revision: '29999' })).toBe('12390');
      expect(productId({ ...win11, arch: 'ARM 64-bit Processor' })).toBe('12389');
    });

    it('takes the name only as a cross-check: a localized name decides nothing', () => {
      expect(
        productId({ ...server2025, name: 'Microsoft Windows 11 Professionnel', revision: '8875' })
      ).toBe('12390');
      expect(
        productId({ ...server2025, name: 'Microsoft Windows Serveur', revision: '33828' })
      ).toBe('12436');
      expect(productId({ ...server2025, name: undefined, revision: '33828' })).toBe('12436');
    });

    it('is unsupported_os when the name contradicts the UBR', () => {
      expect(reason({ ...server2025, name: 'Microsoft Windows 11 Pro' })).toMatch(/26100.*33828/);
      expect(
        reason({ ...server2025, name: 'Microsoft Windows Server 2025', revision: '8875' })
      ).toMatch(/Windows 11 24H2/);
    });
  });

  describe('missing UBR', () => {
    it.each([[''], ['0'], [0], [undefined], ['abc'], ['-5']])(
      'revision %j is unsupported_os',
      (revision) => {
        expect(reason({ ...win10, revision })).toMatch(/no UBR/);
      }
    );

    it('accepts a numeric UBR', () => {
      expect(productId({ ...win10, revision: 4651 })).toBe('12097');
    });
  });

  it.each([
    [{ build: '22631', revision: '1', name: 'Microsoft Windows 11 Pro' }, '12243'],
    [{ build: '26200', revision: '1', name: 'Microsoft Windows 11 Pro' }, '20438'],
    [{ build: '17763', revision: '1', name: 'Microsoft Windows Server 2019 Standard' }, '11571'],
  ])('maps %j to %s', (patch, expected) => {
    expect(productId({ ...win10, ...patch })).toBe(expected);
  });

  describe('build 17763 is Windows Server 2019 or Windows 10 1809 / LTSC 2019, told apart by name', () => {
    const ltsc2019 = {
      ...win10,
      build: '17763',
      revision: '9020',
      name: 'Microsoft Windows 10 Enterprise LTSC 2019',
    };

    it('is unsupported_os for Windows 10 LTSC 2019: MSRC lists it under another product', () => {
      expect(reason(ltsc2019)).toMatch(
        /17763.*Windows 10 1809.*"Microsoft Windows 10 Enterprise LTSC 2019"/
      );
    });

    it('maps Windows Server 2019 Datacenter to product 11571', () => {
      expect(productId({ ...ltsc2019, name: 'Microsoft Windows Server 2019 Datacenter' })).toBe(
        '11571'
      );
    });

    it.each([[''], [undefined], ['Microsoft Windows Serveur 2019 Datacenter'], ['Windows 10 Pro']])(
      'is unsupported_os when the name %j does not say Server',
      (name) => {
        expect(reason({ ...ltsc2019, name })).toMatch(/does not say Server/);
      }
    );
  });

  it('is unsupported_os for a build with no MSRC product, naming the build', () => {
    expect(reason({ ...win10, build: '19044' })).toBe(
      'build 19044 is not a supported Windows version'
    );
    expect(reason({ ...win10, build: undefined })).toBe('no build number');
  });

  it('is unsupported_os for an architecture MSRC publishes no product for', () => {
    expect(reason({ ...server2022, arch: '32-bit' })).toBe(
      'Windows Server 2022 has no x86 product'
    );
    expect(reason({ ...server2025, arch: 'ARM 64-bit Processor' })).toBe(
      'Windows Server 2025 has no arm64 product'
    );
  });
});
