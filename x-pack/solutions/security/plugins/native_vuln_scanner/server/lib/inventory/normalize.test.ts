/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeDebRow, normalizeOs, normalizeRpmRow } from './normalize';

describe('normalizeDebRow', () => {
  it('keeps installed rows and derives the source package', () => {
    expect(
      normalizeDebRow({
        name: 'libssl3',
        version: '3.0.13-0ubuntu3',
        arch: 'amd64',
        source: 'openssl',
        status: 'install ok installed',
      })
    ).toEqual({ name: 'libssl3', version: '3.0.13-0ubuntu3', arch: 'amd64', source: 'openssl' });
  });

  it('strips a versioned source reference and falls back to the package name', () => {
    expect(normalizeDebRow({ name: 'x', version: '1', source: 'src (1.2)' })?.source).toBe('src');
    expect(normalizeDebRow({ name: 'x', version: '1' })?.source).toBe('x');
  });

  it('drops rows that dpkg does not consider installed', () => {
    const skipped: Record<string, number> = {};
    for (const status of [
      'deinstall ok config-files',
      'purge ok not-installed',
      'install ok half-installed',
    ]) {
      expect(normalizeDebRow({ name: 'x', version: '1', status }, skipped)).toBeUndefined();
    }
    expect(skipped).toEqual({ deb_not_installed: 3 });
  });

  it('drops rows without name or version', () => {
    const skipped: Record<string, number> = {};
    expect(normalizeDebRow({ name: 'x' }, skipped)).toBeUndefined();
    expect(normalizeDebRow({ version: '1' }, skipped)).toBeUndefined();
    expect(normalizeDebRow({ name: ' ', version: '1' }, skipped)).toBeUndefined();
    expect(skipped).toEqual({ deb_missing_field: 3 });
  });
});

describe('normalizeRpmRow', () => {
  it('builds epoch:version-release from the split columns', () => {
    expect(
      normalizeRpmRow({
        name: 'openssl-libs',
        epoch: 1,
        version: '3.2.2',
        release: '6.el9',
        arch: 'x86_64',
        source: 'openssl-3.2.2-6.el9.src.rpm',
      })
    ).toEqual({
      name: 'openssl-libs',
      version: '1:3.2.2-6.el9',
      arch: 'x86_64',
      source: 'openssl-3.2.2-6.el9.src.rpm',
    });
  });

  it('treats a missing or empty epoch as zero', () => {
    expect(normalizeRpmRow({ name: 't', version: '2023c', release: '1.el8' })?.version).toBe(
      '0:2023c-1.el8'
    );
    expect(normalizeRpmRow({ name: 't', epoch: '', version: '1', release: '1' })?.version).toBe(
      '0:1-1'
    );
  });

  it('drops gpg-pubkey and rows missing name, version or release', () => {
    const skipped: Record<string, number> = {};
    expect(
      normalizeRpmRow({ name: 'gpg-pubkey', version: '1', release: '2' }, skipped)
    ).toBeUndefined();
    expect(normalizeRpmRow({ name: 'x', version: '1' }, skipped)).toBeUndefined();
    expect(normalizeRpmRow({ epoch: 1, version: '1', release: '2' }, skipped)).toBeUndefined();
    expect(skipped).toEqual({ rpm_gpg_pubkey: 1, rpm_missing_field: 2 });
  });

  it('maps a (none) arch to undefined', () => {
    expect(normalizeRpmRow({ name: 'x', version: '1', release: '1', arch: '(none)' })?.arch).toBe(
      undefined
    );
  });
});

describe('normalizeOs', () => {
  it('maps ubuntu to its codename', () => {
    expect(normalizeOs({ platform: 'ubuntu', codename: 'noble', major: '24' })).toEqual({
      family: 'ubuntu',
      version: 'noble',
    });
  });

  it('maps rhel and its rebuilds to the major version', () => {
    // Alma/Rocky: /etc/redhat-release forces platform to rhel.
    expect(normalizeOs({ platform: 'rhel', platform_like: 'rhel', major: '9' })).toEqual({
      family: 'rhel',
      version: '9',
    });
  });

  it('does not match platform_like to rhel', () => {
    // Real rebuilds report platform rhel (os-release ID_LIKE never decides the feed).
    // Amazon Linux 2 lists rhel in ID_LIKE but is not a RHEL rebuild.
    expect(normalizeOs({ platform: 'amzn', platform_like: 'centos rhel fedora', major: '2' })).toBe(
      'unsupported_os'
    );
    expect(normalizeOs({ platform: 'fedora', platform_like: 'rhel', major: '41' })).toBe(
      'unsupported_os'
    );
  });

  it('rejects unknown platforms and hosts without a usable release', () => {
    expect(normalizeOs({ platform: 'sles', major: '15' })).toBe('unsupported_os');
    expect(normalizeOs({ platform: 'ubuntu' })).toBe('missing_os_release');
    // osquery defaults major to "0" when it cannot read a version.
    expect(normalizeOs({ platform: 'rhel', major: '0' })).toBe('missing_os_release');
  });
});
