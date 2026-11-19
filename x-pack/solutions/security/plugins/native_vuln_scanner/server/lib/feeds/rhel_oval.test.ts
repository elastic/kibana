/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { rpmKey } from '../version_compare';
import { classifyRhelCriterion, parseRhelOval } from './rhel_oval';
import type { FeedParseResult } from './types';

// Five definitions trimmed from rhel-9.oval.xml with every referenced test, object and state.
const fixture = readFileSync(join(__dirname, '__fixtures__', 'rhel_9_trimmed.oval.xml'));

describe('parseRhelOval', () => {
  let result: FeedParseResult;

  beforeAll(async () => {
    result = await parseRhelOval([fixture], { major: '9' });
  });

  const byAdvisory = (id: string) => result.records.filter((r) => r.advisory.id === id);

  it('reads feed metadata', () => {
    expect(result.os).toEqual({ family: 'rhel', version: '9' });
    expect(result.snapshotTime).toBe('2026-11-12T19:21:30Z');
    expect(result.definitions).toBe(5);
  });

  it('emits one record per binary with advisory, CVE and arch details', () => {
    const giflib = byAdvisory('RHSA-2026:19367');
    expect(giflib.map((r) => r.package.name)).toEqual(['giflib', 'giflib-devel']);
    expect(giflib[0]).toEqual({
      advisory: {
        id: 'RHSA-2026:19367',
        source: 'redhat',
        definition_id: 'oval:com.redhat.rhsa:def:202619367',
        title: 'RHSA-2026:19367: giflib update (Important)',
        url: 'https://access.redhat.com/errata/RHSA-2026:19367',
        severity: 'Important',
        published: '2026-05-19T00:00:00Z',
        modified: '2026-05-19T00:00:00Z',
      },
      os: { family: 'rhel', version: '9' },
      kind: 'package',
      package: {
        name: 'giflib',
        arch: { operation: 'pattern match', value: 'aarch64|i686|ppc64le|s390x|x86_64' },
      },
      fixed_version: {
        raw: '0:5.2.1-10.el9_8.1',
        scheme: 'rpm',
        key: rpmKey('0:5.2.1-10.el9_8.1'),
      },
      cves: [
        {
          id: 'CVE-2026-23868',
          url: 'https://access.redhat.com/security/cve/CVE-2026-23868',
          published: '2026-03-10T18:53:00Z',
          severity: 'important',
          cvss: {
            version: '3.1',
            score: 7,
            vector: 'CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:H',
          },
          cwe: 'CWE-825',
        },
      ],
      conditions: [],
      feed: { snapshot_time: '2026-11-12T19:21:30Z' },
    });
    // Same state, separate test.
    expect(giflib[1].package.arch).toEqual(giflib[0].package.arch);
  });

  it('gates module stream packages on the enabled module', () => {
    const nodejs = byAdvisory('RHSA-2023:2654');
    expect(nodejs).toHaveLength(8);
    expect(nodejs.find((r) => r.package.name === 'npm')?.fixed_version?.raw).toBe(
      '1:9.5.0-1.18.14.2.2.module+el9.2.0.z+18497+a402347c'
    );
    for (const r of nodejs) {
      expect(r.conditions).toEqual([[{ type: 'module_enabled', module: 'nodejs:18' }]]);
    }
    expect(nodejs[0].cves).toHaveLength(8);
  });

  it('gates kernel packages on the running kernel', () => {
    const kernel = byAdvisory('RHSA-2023:1703');
    expect(kernel.map((r) => r.package.name)).toEqual(
      expect.arrayContaining(['kernel', 'kernel-core', 'bpftool', 'perf', 'python3-perf'])
    );
    for (const r of kernel) {
      expect(r.fixed_version?.raw).toBe('0:5.14.0-162.23.1.el9_1');
      expect(r.conditions).toEqual([
        [
          {
            type: 'running_kernel',
            package: 'kernel',
            operation: 'less than',
            evr: '0:5.14.0-162.23.1.el9_1',
          },
        ],
      ]);
    }
  });

  it('keeps the kpatch package row and drops the branch with no package', () => {
    expect(byAdvisory('RHSA-2026:47981')).toEqual([
      expect.objectContaining({
        package: { name: 'kpatch-patch-5_14_0-687_10_1' },
        fixed_version: expect.objectContaining({ raw: '0:1-5.el9_8' }),
        conditions: [
          [
            {
              type: 'running_kernel',
              package: 'kernel',
              operation: 'equals',
              evr: '0:5.14.0-687.10.1.el9_8',
            },
          ],
        ],
      }),
    ]);
    expect(result.skipped).toEqual({ branch_without_package: 1 });
  });

  it('keeps bug-fix advisories that list CVEs', () => {
    expect(byAdvisory('RHBA-2024:2274').map((r) => r.package)).toEqual([
      {
        name: 'git-lfs',
        arch: { operation: 'pattern match', value: 'aarch64|ppc64le|s390x|x86_64' },
      },
    ]);
  });

  it('keeps one row per arch when tests for the same package differ in arch', async () => {
    // Shape of RHEL-8 module packages such as hivex: an i686-only test and a multi-arch test.
    const test = (id: string, state: string, comment: string) =>
      `<red-def:rpminfo_test id="${id}" comment="${comment}"><red-def:state state_ref="${state}"/></red-def:rpminfo_test>`;
    const state = (id: string, operation: string, arch: string) =>
      `<red-def:rpminfo_state id="${id}"><red-def:arch operation="${operation}">${arch}</red-def:arch></red-def:rpminfo_state>`;
    const earlier = 'hivex is earlier than 0:1.3.15-7.el8';
    const doc = `<oval_definitions xmlns:red-def="urn:red-def"><definitions>
      <definition class="patch" id="oval:x:def:1"><metadata><title>RHSA-1:1</title>
        <reference ref_id="RHSA-1:1" source="RHSA"/><advisory><cve>CVE-1-1</cve></advisory></metadata>
        <criteria operator="AND">
          <criterion comment="Red Hat Enterprise Linux 8 is installed"/>
          <criteria operator="OR">
            <criterion comment="${earlier}" test_ref="t1"/>
            <criterion comment="${earlier}" test_ref="t2"/>
            <criterion comment="${earlier}" test_ref="t3"/>
          </criteria>
        </criteria>
      </definition></definitions>
      <tests>${test('t1', 's1', earlier)}${test('t2', 's2', earlier)}${test(
      't3',
      's2',
      earlier
    )}</tests>
      <states>${state('s1', 'equals', 'i686')}${state(
      's2',
      'pattern match',
      'x86_64|aarch64'
    )}</states>
    </oval_definitions>`;
    const { records } = await parseRhelOval([doc], { major: '8' });
    expect(records.map((r) => r.package)).toEqual([
      { name: 'hivex', arch: { operation: 'equals', value: 'i686' } },
      { name: 'hivex', arch: { operation: 'pattern match', value: 'x86_64|aarch64' } },
    ]);
  });

  it('treats an arch state without an operation as equals', async () => {
    const earlier = 'hivex is earlier than 0:1.3.15-7.el8';
    const doc = `<oval_definitions xmlns:red-def="urn:red-def"><definitions>
      <definition class="patch" id="oval:x:def:1"><metadata><title>RHSA-1:1</title>
        <reference ref_id="RHSA-1:1" source="RHSA"/><advisory><cve>CVE-1-1</cve></advisory></metadata>
        <criteria operator="AND">
          <criterion comment="Red Hat Enterprise Linux 8 is installed"/>
          <criterion comment="${earlier}" test_ref="t1"/>
        </criteria>
      </definition></definitions>
      <tests><red-def:rpminfo_test id="t1" comment="${earlier}"><red-def:state state_ref="s1"/></red-def:rpminfo_test></tests>
      <states><red-def:rpminfo_state id="s1"><red-def:arch>x86_64</red-def:arch></red-def:rpminfo_state></states>
    </oval_definitions>`;
    const { records } = await parseRhelOval([doc], { major: '8' });
    expect(records.map((r) => r.package)).toEqual([
      { name: 'hivex', arch: { operation: 'equals', value: 'x86_64' } },
    ]);
  });

  it('skips a package whose arch operation is unsupported instead of widening it to all arches', async () => {
    const earlier = 'hivex is earlier than 0:1.3.15-7.el8';
    const test = (id: string, state: string) =>
      `<red-def:rpminfo_test id="${id}" comment="${earlier}"><red-def:state state_ref="${state}"/></red-def:rpminfo_test>`;
    const doc = `<oval_definitions xmlns:red-def="urn:red-def"><definitions>
      <definition class="patch" id="oval:x:def:1"><metadata><title>RHSA-1:1</title>
        <reference ref_id="RHSA-1:1" source="RHSA"/><advisory><cve>CVE-1-1</cve></advisory></metadata>
        <criteria operator="AND">
          <criterion comment="Red Hat Enterprise Linux 8 is installed"/>
          <criteria operator="OR">
            <criterion comment="${earlier}" test_ref="t1"/>
            <criterion comment="${earlier}" test_ref="t2"/>
          </criteria>
        </criteria>
      </definition></definitions>
      <tests>${test('t1', 's1')}${test('t2', 's2')}</tests>
      <states><red-def:rpminfo_state id="s1"><red-def:arch operation="not equal">i686</red-def:arch></red-def:rpminfo_state>
        <red-def:rpminfo_state id="s2"><red-def:arch operation="equals">x86_64</red-def:arch></red-def:rpminfo_state></states>
    </oval_definitions>`;
    const { records, skipped } = await parseRhelOval([doc], { major: '8' });
    expect(records.map((r) => r.package)).toEqual([
      { name: 'hivex', arch: { operation: 'equals', value: 'x86_64' } },
    ]);
    expect(skipped.unsupported_arch_operation).toBe(1);
  });

  it('drops every row when the feed is for another major release', async () => {
    const other = await parseRhelOval([fixture], { major: '8' });
    expect(other.records).toEqual([]);
    expect(other.skipped.other_release).toBeGreaterThan(0);
  });
});

describe('rhel_9_trimmed fixture', () => {
  const xml = fixture.toString('utf8');
  const ids = (section: string) => {
    const body = xml.split(`<${section}>`)[1]?.split(`</${section}>`)[0] ?? '';
    return new Set([...body.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id));
  };
  const tests = [
    ...xml.matchAll(
      /<\S+_test [^>]*comment="([^"]*)" id="([^"]+)"[^>]*>\s*<\S+ object_ref="([^"]+)"\/>\s*<\S+ state_ref="([^"]+)"\/>/g
    ),
  ].map(([, comment, id, objectRef, stateRef]) => ({ comment, id, objectRef, stateRef }));

  it('defines a test for every criterion', () => {
    const defined = new Set(tests.map((t) => t.id));
    const referenced = [...xml.matchAll(/test_ref="([^"]+)"/g)].map(([, ref]) => ref);
    expect(referenced.filter((ref) => !defined.has(ref))).toEqual([]);
  });

  it('defines the object and state of every test', () => {
    const objects = ids('objects');
    const states = ids('states');
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.filter((t) => !objects.has(t.objectRef))).toEqual([]);
    expect(tests.filter((t) => !states.has(t.stateRef))).toEqual([]);
  });

  it('names the package of each rpminfo test object as in the criterion comment', () => {
    const names = new Map(
      [...xml.matchAll(/<red-def:rpminfo_object id="([^"]+)"[^>]*>\s*<red-def:name>([^<]+)</g)].map(
        ([, id, name]) => [id, name]
      )
    );
    const rpmTests = tests.filter((t) => names.has(t.objectRef));
    expect(rpmTests.length).toBeGreaterThan(0);
    expect(rpmTests.filter((t) => !t.comment.startsWith(`${names.get(t.objectRef)} `))).toEqual([]);
  });
});

describe('classifyRhelCriterion', () => {
  const classify = (comment: string) => classifyRhelCriterion(comment, undefined, '8');

  it.each([
    ['Red Hat Enterprise Linux 8 is installed', 'true'],
    ['Red Hat Enterprise Linux 9 is installed', 'false'],
    ['Red Hat Enterprise Linux must be installed', 'false'],
    ['Red Hat CoreOS 4 is installed', 'false'],
    ['openssl is signed with Red Hat redhatrelease2 key', 'true'],
    ['kpatch-patch not installed for 0:4.18.0-147.el8', 'true'],
    ['kernel version 0:4.18.0-147.el8 is set to boot up on next boot', 'false'],
    ['kernel-rt earlier than 0:4.18.0-1.el8 is set to boot up on next boot', 'false'],
    ['openssl is earlier than 1:1.1.1k-12.el8_9', 'leaf'],
    ['Module nodejs:18 is enabled', 'condition'],
    ['kernel-rt earlier than 0:4.18.0-1.el8 is currently running', 'condition'],
    ['kernel version equals 0:4.18.0-147.el8', 'condition'],
  ])('%s -> %s', (comment, kind) => {
    expect(classify(comment).kind).toBe(kind);
  });

  it('flags comments it does not know', () => {
    expect(classify('SELinux is enforcing')).toEqual({
      kind: 'false',
      reason: 'unrecognised_criterion',
    });
  });

  it('captures the kernel package for running-kernel comparisons', () => {
    expect(classify('kernel-rt earlier than 0:4.18.0-1.el8 is currently running')).toEqual({
      kind: 'condition',
      condition: {
        type: 'running_kernel',
        package: 'kernel-rt',
        operation: 'less than',
        evr: '0:4.18.0-1.el8',
      },
    });
  });
});

describe('parseRhelOval with includeUnfixed', () => {
  const unpatched = readFileSync(
    join(__dirname, '__fixtures__', 'rhel_9_unpatched_trimmed.oval.xml')
  );

  it('ignores vulnerability definitions when includeUnfixed is off', async () => {
    const result = await parseRhelOval([unpatched], { major: '9' });
    expect(result.records).toEqual([]);
    expect(result.definitions).toBe(0);
  });

  it('emits presence records for unpatched definitions', async () => {
    const result = await parseRhelOval([unpatched], { major: '9', includeUnfixed: true });

    expect(result.definitions).toBe(0);
    expect(result.skipped).toEqual({ unfixed_definitions: 2 });
    expect(result.records.map((r) => [r.advisory.id, r.package.name, r.vendor_reason])).toEqual([
      ['CVE-2005-2541', 'tar', 'Will not fix'],
      ['CVE-2016-1247', 'nginx-core', 'Affected'],
      ['CVE-2016-1247', 'nginx-all-modules', 'Affected'],
    ]);
    for (const record of result.records) {
      expect(record.fixed_version).toBeUndefined();
      expect(record.unfixed).toBe(true);
      expect(record.conditions).toEqual([]);
    }
    const tar = result.records[0];
    expect(tar.advisory).toMatchObject({
      source: 'redhat',
      definition_id: 'oval:com.redhat.cve:def:20052541',
      url: 'https://access.redhat.com/security/cve/CVE-2005-2541',
      severity: 'Moderate',
    });
    expect(tar.cves.map((c) => c.id)).toEqual(['CVE-2005-2541']);
  });
});
