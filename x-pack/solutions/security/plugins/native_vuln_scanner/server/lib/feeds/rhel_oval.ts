/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rpmKey, UnencodableVersionError } from '../version_compare';
import type { Atom, Conjunction, XmlNode } from './oval';
import {
  child,
  children,
  countInto,
  expandCriteria,
  groupByLeaf,
  ovalPublicToIso,
  ovalTimestampToIso,
  parseSlashCvss,
  readOval,
  UnsupportedCriteriaError,
  type OvalInput,
} from './oval';
import type {
  AdvisoryCondition,
  AdvisoryCve,
  AdvisoryRecord,
  ArchConstraint,
  FeedParseResult,
} from './types';

/*
 * Red Hat OVAL v2 has one `patch` definition per RHSA. Criteria comments are generated from the
 * tests and carry everything needed: "PKG is earlier than EVR" (the state evr), module streams,
 * and the running kernel. The rpminfo_state is only read for the optional arch constraint.
 */

interface RhelLeaf {
  name: string;
  evr: string;
  testRef?: string;
}

const EARLIER_THAN = /^(\S+) is earlier than (\S+)$/;
const SIGNED = / is signed with Red Hat \S+ key$/;
const RHEL_INSTALLED = /^Red Hat Enterprise Linux (\d+) is installed$/;
const MODULE_ENABLED = /^Module (\S+) is enabled$/;
const KERNEL_EARLIER_RUNNING = /^(kernel(?:-rt)?) earlier than (\S+) is currently running$/;
const KERNEL_EQUALS_RUNNING = /^kernel version (\S+) is currently running$/;
const KERNEL_EQUALS = /^kernel version equals (\S+)$/;
const KERNEL_NEXT_BOOT = / is set to boot up on next boot$/;
const KPATCH_NOT_INSTALLED = /^kpatch-patch not installed for \S+$/;

export interface ParseRhelOvalOptions {
  /** Major release the feed covers, e.g. `9`. */
  major: string;
}

export const classifyRhelCriterion = (
  comment: string,
  testRef: string | undefined,
  major: string
): Atom<RhelLeaf, AdvisoryCondition> => {
  const earlier = comment.match(EARLIER_THAN);
  if (earlier) return { kind: 'leaf', leaf: { name: earlier[1], evr: earlier[2], testRef } };
  // Package presence is implied by the version comparison; signatures are not inventoried.
  if (SIGNED.test(comment)) return { kind: 'true' };
  const installed = comment.match(RHEL_INSTALLED);
  if (installed) {
    return installed[1] === major ? { kind: 'true' } : { kind: 'false', reason: 'other_release' };
  }
  // OVAL v2 guard branch: true only on hosts that are not RHEL at all.
  if (comment === 'Red Hat Enterprise Linux must be installed') return { kind: 'false' };
  if (comment === 'Red Hat CoreOS 4 is installed') return { kind: 'false' };
  const module = comment.match(MODULE_ENABLED);
  if (module)
    return { kind: 'condition', condition: { type: 'module_enabled', module: module[1] } };
  const kernelEarlier = comment.match(KERNEL_EARLIER_RUNNING);
  if (kernelEarlier) {
    return {
      kind: 'condition',
      condition: {
        type: 'running_kernel',
        package: kernelEarlier[1],
        operation: 'less than',
        evr: kernelEarlier[2],
      },
    };
  }
  const kernelEquals = comment.match(KERNEL_EQUALS_RUNNING) ?? comment.match(KERNEL_EQUALS);
  if (kernelEquals) {
    return {
      kind: 'condition',
      condition: {
        type: 'running_kernel',
        package: 'kernel',
        operation: 'equals',
        evr: kernelEquals[1],
      },
    };
  }
  // Only the running kernel is inventoried; the next-boot alternative is never asserted.
  if (KERNEL_NEXT_BOOT.test(comment)) return { kind: 'false' };
  if (KPATCH_NOT_INSTALLED.test(comment)) return { kind: 'true' };
  return { kind: 'false', reason: 'unrecognised_criterion' };
};

interface PendingDefinition {
  id: string;
  title: string;
  rhsa: string;
  url?: string;
  severity?: string;
  issued?: string;
  updated?: string;
  cves: AdvisoryCve[];
  leaves: Array<{ leaf: RhelLeaf; conditions: AdvisoryCondition[][] }>;
}

const dateToIso = (value: string | undefined): string | undefined =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : undefined;

const parseCves = (advisory: XmlNode | undefined): AdvisoryCve[] =>
  advisory
    ? children(advisory, 'cve').map(({ attrs, text }) => ({
        id: text,
        url: attrs.href,
        published: ovalPublicToIso(attrs.public),
        severity: attrs.impact,
        cvss: parseSlashCvss(attrs.cvss3, '3.1') ?? parseSlashCvss(attrs.cvss2, '2.0'),
        cwe: attrs.cwe,
      }))
    : [];

interface ResolvedLeaf {
  leaf: RhelLeaf;
  arch?: ArchConstraint;
  conditions: AdvisoryCondition[][];
}

/**
 * Folds test-level leaves that resolve to the same package, version and arch into one row, OR-ing
 * their conditions (an unconditional branch makes the row unconditional).
 */
const mergeByArch = (
  leaves: PendingDefinition['leaves'],
  archOf: (testRef: string) => ArchConstraint | undefined
): ResolvedLeaf[] => {
  const merged = new Map<string, ResolvedLeaf & { conditionKeys: Set<string> }>();
  for (const { leaf, conditions } of leaves) {
    const arch = leaf.testRef ? archOf(leaf.testRef) : undefined;
    const key = JSON.stringify([leaf.name, leaf.evr, arch?.operation, arch?.value]);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        leaf,
        arch,
        conditions,
        conditionKeys: new Set(conditions.map((c) => JSON.stringify(c))),
      });
    } else if (existing.conditions.length > 0) {
      if (conditions.length === 0) {
        existing.conditions = [];
      } else {
        for (const c of conditions) {
          const conditionKey = JSON.stringify(c);
          if (!existing.conditionKeys.has(conditionKey)) {
            existing.conditionKeys.add(conditionKey);
            existing.conditions.push(c);
          }
        }
      }
    }
  }
  return [...merged.values()].map(({ leaf, arch, conditions }) => ({ leaf, arch, conditions }));
};

export const parseRhelOval = async (
  input: OvalInput,
  { major }: ParseRhelOvalOptions
): Promise<FeedParseResult> => {
  const skipped: Record<string, number> = {};
  const pending: PendingDefinition[] = [];
  let definitions = 0;
  let snapshotTime: string | undefined;
  const wantedTests = new Set<string>();
  const testStates = new Map<string, string>();
  const wantedStates = new Set<string>();
  const stateArch = new Map<string, ArchConstraint>();

  const onDefinition = (node: XmlNode): void => {
    if (node.attrs.class !== 'patch') return;
    definitions++;
    const metadata = child(node, 'metadata');
    const criteria = child(node, 'criteria');
    if (!metadata || !criteria) {
      countInto(skipped, 'malformed_definition');
      return;
    }
    const references = children(metadata, 'reference');
    const rhsa = references.find((r) => r.attrs.source === 'RHSA');
    const advisory = child(metadata, 'advisory');
    const cves = parseCves(advisory);
    if (!rhsa || cves.length === 0) {
      countInto(skipped, 'no_cve');
      return;
    }
    let conjunctions: Array<Conjunction<RhelLeaf, AdvisoryCondition>>;
    try {
      conjunctions = expandCriteria<RhelLeaf, AdvisoryCondition>(
        criteria,
        ({ comment, testRef }) => classifyRhelCriterion(comment, testRef, major),
        (reason) => countInto(skipped, reason)
      );
    } catch (e) {
      if (!(e instanceof UnsupportedCriteriaError)) throw e;
      countInto(skipped, `criteria_${e.reason}`);
      return;
    }
    const leaves = groupByLeaf(
      conjunctions,
      // Per test, not per name+evr: tests for the same package can carry different arch states.
      (leaf) => leaf.testRef ?? `${leaf.name}\u0000${leaf.evr}`,
      (reason) => countInto(skipped, reason === 'no_leaf' ? 'kpatch_without_package' : reason)
    );
    if (leaves.length === 0) return;
    for (const { leaf } of leaves) if (leaf.testRef) wantedTests.add(leaf.testRef);
    pending.push({
      id: node.attrs.id,
      title: child(metadata, 'title')?.text ?? '',
      rhsa: rhsa.attrs.ref_id,
      url: rhsa.attrs.ref_url,
      severity: (advisory && child(advisory, 'severity')?.text) || undefined,
      issued: dateToIso(advisory && child(advisory, 'issued')?.attrs.date),
      updated: dateToIso(advisory && child(advisory, 'updated')?.attrs.date),
      cves,
      leaves,
    });
  };

  await readOval(input, {
    onTimestamp: (ts) => {
      snapshotTime = ovalTimestampToIso(ts);
    },
    onItem: (section, node) => {
      if (section === 'definitions') {
        onDefinition(node);
      } else if (section === 'tests' && wantedTests.has(node.attrs.id)) {
        const stateRef = child(node, 'state')?.attrs.state_ref;
        if (stateRef) {
          testStates.set(node.attrs.id, stateRef);
          wantedStates.add(stateRef);
        }
      } else if (section === 'states' && wantedStates.has(node.attrs.id)) {
        const arch = child(node, 'arch');
        const operation = arch?.attrs.operation;
        if (arch && (operation === 'equals' || operation === 'pattern match')) {
          stateArch.set(node.attrs.id, { operation, value: arch.text });
        }
      }
    },
  });

  const os = { family: 'rhel' as const, version: major };
  const records: AdvisoryRecord[] = [];
  for (const def of pending) {
    for (const { leaf, arch, conditions } of mergeByArch(def.leaves, (testRef) => {
      const stateRef = testStates.get(testRef);
      return stateRef ? stateArch.get(stateRef) : undefined;
    })) {
      let key: string | undefined;
      try {
        key = rpmKey(leaf.evr);
      } catch (e) {
        if (!(e instanceof UnencodableVersionError)) throw e;
        countInto(skipped, 'unencodable_version_kept');
      }
      records.push({
        advisory: {
          id: def.rhsa,
          source: 'redhat',
          definition_id: def.id,
          title: def.title,
          url: def.url,
          severity: def.severity,
          published: def.issued,
          modified: def.updated,
        },
        os,
        kind: 'package',
        package: arch ? { name: leaf.name, arch } : { name: leaf.name },
        fixed_version: { raw: leaf.evr, scheme: 'rpm', key },
        cves: def.cves,
        conditions,
        feed: { snapshot_time: snapshotTime },
      });
    }
  }

  return { os, snapshotTime, definitions, records, skipped };
};
