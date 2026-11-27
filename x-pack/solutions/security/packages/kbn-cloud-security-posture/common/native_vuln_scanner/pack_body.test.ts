/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVENTORY_PACK_BODY } from './pack_body';
import { INVENTORY_QUERIES } from './queries';

/** Pins the fields osquery's `validatePackScheduleFields` and create-pack schema check. */
describe('INVENTORY_PACK_BODY', () => {
  it('does not carry per-query schedule fields', () => {
    Object.values(INVENTORY_PACK_BODY.queries).forEach((query) => {
      expect(Object.keys(query).sort()).toEqual(['id', 'platform', 'query', 'snapshot']);
    });
  });

  it('only uses top-level keys the osquery create-pack schema accepts', () => {
    const accepted = [
      'name',
      'description',
      'enabled',
      'policy_ids',
      'shards',
      'queries',
      'schedule_type',
      'interval',
      'rrule_schedule',
      'min_osquery_version',
      'result_type',
      'platform',
    ];
    expect(Object.keys(INVENTORY_PACK_BODY).filter((key) => !accepted.includes(key))).toEqual([]);
  });

  it('queries the language-packages extension table with its full column set', () => {
    const query = INVENTORY_QUERIES.language_packages;
    expect(query.id).toBe('native_vuln_scanner_language_packages');
    expect(query.platform).toBe('linux');
    expect(query.snapshot).toBe(true);
    for (const column of [
      'ecosystem',
      'namespace',
      'name',
      'version',
      'purl',
      'path',
      'manager',
      'install_time',
    ]) {
      expect(query.query).toContain(column);
    }
    expect(query.query).toContain('FROM elastic_language_packages');
  });

  it('scopes the Windows queries to windows and the Linux ones to linux', () => {
    const { windows_os_version: osVersion, windows_patches: patches } = INVENTORY_QUERIES;
    expect(osVersion.platform).toBe('windows');
    expect(patches.platform).toBe('windows');
    for (const column of [
      'name',
      'version',
      'major',
      'minor',
      'build',
      'revision',
      'arch',
      'platform',
    ]) {
      expect(osVersion.query).toContain(column);
    }
    expect(osVersion.query).toContain('FROM os_version');
    expect(patches.query).toBe('SELECT hotfix_id FROM patches;');
    expect(INVENTORY_QUERIES.os_version.platform).toBe('linux');
  });

  it('puts both Windows queries in the pack with unique ids', () => {
    const ids = Object.values(INVENTORY_QUERIES).map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(INVENTORY_PACK_BODY.queries.native_vuln_scanner_windows_os_version.platform).toBe(
      'windows'
    );
    expect(INVENTORY_PACK_BODY.queries.native_vuln_scanner_windows_patches.platform).toBe(
      'windows'
    );
  });
});
