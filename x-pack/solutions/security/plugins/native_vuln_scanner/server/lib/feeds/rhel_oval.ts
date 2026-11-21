/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { advisoryKnowledgeId, cveKnowledgeId } from '../knowledge/constants';
import { rpmKey, UnencodableVersionError } from '../version_compare';
import type { Atom, Conjunction, XmlNode } from './oval';
import {
  child,
  children,
  countInto,
  descendant,
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
  KnowledgeEntry,
} from './types';

/*
 * Red Hat OVAL v2 has one `patch` definition per RHSA. Criteria comments are generated from the
 * tests and carry everything needed: "PKG is earlier than EVR" (the state evr), module streams,
 * and the running kernel. The rpminfo_state is only read for the optional arch constraint.
 */

/** "PKG is earlier than EVR" (patched feed): the package is fixed at EVR. */
interface RhelFixedLeaf {
  name: string;
  evr: string;
  unfixed?: undefined;
  testRef?: string;
}

/** "PKG is installed" (unpatched feed): affected, no fixed version. */
interface RhelPresenceLeaf {
  name: string;
  evr: undefined;
  unfixed: true;
  testRef?: string;
}

type RhelLeaf = RhelFixedLeaf | RhelPresenceLeaf;

const EARLIER_THAN = /^(\S+) is earlier than (\S+)$/;
const SIGNED = / is signed with Red Hat \S+ key$/;
const RHEL_INSTALLED = /^Red Hat Enterprise Linux (\d+) is installed$/;
const INSTALLED = /^(\S+) is installed$/;
const MODULE_ENABLED = /^Module (\S+) is enabled$/;
const KERNEL_EARLIER_RUNNING = /^(kernel(?:-rt)?) earlier than (\S+) is currently running$/;
const KERNEL_EQUALS_RUNNING = /^kernel version (\S+) is currently running$/;
const KERNEL_EQUALS = /^kernel version equals (\S+)$/;
const KERNEL_NEXT_BOOT = / is set to boot up on next boot$/;
const KPATCH_NOT_INSTALLED = /^kpatch-patch not installed for \S+$/;

export interface ParseRhelOvalOptions {
  /** Major release the feed covers, e.g. `9`. */
  major: string;
  /** Parse `oval:com.redhat.cve:` vulnerability definitions (unpatched feed). */
  includeUnfixed?: boolean;
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
  // Unpatched feed presence test; must come after RHEL_INSTALLED, which it also matches.
  const presence = comment.match(INSTALLED);
  if (presence)
    return { kind: 'leaf', leaf: { name: presence[1], evr: undefined, unfixed: true, testRef } };
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
  /** RHSA ref_id on patched defs, the CVE ref_id on unpatched defs. */
  advisoryId: string;
  url?: string;
  refs?: Array<{ id: string; url: string }>;
  severity?: string;
  issued?: string;
  updated?: string;
  cves: AdvisoryCve[];
  /** Present on unpatched-feed definitions: component -> vendor resolution state. */
  resolution?: Map<string, string>;
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

const SECTION_HEADING = /(?:^|\s)(DOCUMENTATION|STATEMENT|MITIGATION):\s*/g;

/** Unfixed RHEL definitions carry "DOCUMENTATION: … STATEMENT: … MITIGATION: …" in one text. */
const splitRedHatSections = (
  text: string
): { split: boolean; fields: Pick<KnowledgeEntry, 'description' | 'impact' | 'workaround'> } => {
  const headings = [...text.matchAll(SECTION_HEADING)];
  if (headings.length === 0) return { split: false, fields: { description: text } };
  const sections: Record<string, string> = {};
  headings.forEach((heading, i) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[i + 1]?.index ?? text.length;
    sections[heading[1]] ??= text.slice(start, end).trim();
  });
  return {
    split: true,
    fields: {
      description: sections.DOCUMENTATION || undefined,
      impact: sections.STATEMENT || undefined,
      workaround: sections.MITIGATION || undefined,
    },
  };
};

export const parseRhelOval = async (
  input: OvalInput,
  { major, includeUnfixed }: ParseRhelOvalOptions
): Promise<FeedParseResult> => {
  const skipped: Record<string, number> = {};
  const pending: PendingDefinition[] = [];
  let definitions = 0;
  let snapshotTime: string | undefined;
  let attribution: string | undefined;
  const knowledge = new Map<string, KnowledgeEntry>();
  const wantedTests = new Set<string>();
  const testStates = new Map<string, string>();
  const wantedStates = new Set<string>();
  const stateArch = new Map<string, ArchConstraint>();
  // States whose arch operation we cannot evaluate; dropping the constraint would widen the record.
  const unsupportedArchStates = new Set<string>();

  const onDefinition = (node: XmlNode): void => {
    const { class: defClass, id } = node.attrs;
    // The unpatched feed's `oval:com.redhat.cve:` defs carry class="vulnerability"; so do
    // `oval:com.redhat.unaffected:` defs, which stay excluded.
    const unfixed = defClass === 'vulnerability' && id.startsWith('oval:com.redhat.cve:');
    if (defClass !== 'patch' && !(unfixed && includeUnfixed)) return;
    if (defClass === 'patch') definitions++;
    else countInto(skipped, 'unfixed_definitions');
    const metadata = child(node, 'metadata');
    const criteria = child(node, 'criteria');
    if (!metadata || !criteria) {
      countInto(skipped, 'malformed_definition');
      return;
    }
    const references = children(metadata, 'reference');
    const advisoryRef = unfixed
      ? references.find((r) => r.attrs.source === 'CVE')
      : references.find((r) => r.attrs.source === 'RHSA');
    const refs: Array<{ id: string; url: string }> = [];
    let refsOverflowed = false;
    for (const { attrs } of references) {
      if (!attrs.ref_url) continue;
      if (refs.length === 10) {
        refsOverflowed = true;
        break;
      }
      refs.push({ id: attrs.ref_id ?? '', url: attrs.ref_url.slice(0, 1024) });
    }
    if (refsOverflowed) countInto(skipped, 'reference_overflow');
    const advisory = child(metadata, 'advisory');
    const cves = parseCves(advisory);
    if (!advisoryRef || cves.length === 0) {
      countInto(skipped, 'no_cve');
      return;
    }
    const resolution = new Map<string, string>();
    if (advisory) {
      for (const affected of children(advisory, 'affected')) {
        for (const res of children(affected, 'resolution')) {
          for (const component of children(res, 'component')) {
            resolution.set(component.text, res.attrs.state);
          }
        }
      }
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
      (reason) => countInto(skipped, reason === 'no_leaf' ? 'branch_without_package' : reason)
    );
    if (leaves.length === 0) return;
    for (const { leaf } of leaves) if (leaf.testRef) wantedTests.add(leaf.testRef);
    attribution ??= descendant(metadata, 'rights')?.text || undefined;
    const descriptionNode = child(metadata, 'description');
    const text = descriptionNode?.text;
    if (text) {
      const entry = {
        title: child(metadata, 'title')?.text || undefined,
        url: advisoryRef.attrs.ref_url,
        severity: (advisory && child(advisory, 'severity')?.text) || undefined,
        references: refs.length > 0 ? refs.map((r) => r.url) : undefined,
        published: dateToIso(advisory && child(advisory, 'issued')?.attrs.date),
        modified: dateToIso(advisory && child(advisory, 'updated')?.attrs.date),
        ...(descriptionNode.truncated ? { truncated: true as const } : {}),
      };
      if (unfixed) {
        const [{ id: cveId, published }] = cves;
        const sections = splitRedHatSections(text);
        knowledge.set(cveKnowledgeId('redhat', major, cveId), {
          ...entry,
          kind: 'cve',
          id: cveId,
          ...sections.fields,
          published: published ?? entry.published,
          // Splitting drops the section headings, so the stored text is an excerpt of the vendor's.
          ...(sections.split ? { truncated: true as const } : {}),
        });
      } else {
        // A patch definition's text is the RHSA description, not a per-CVE one.
        knowledge.set(advisoryKnowledgeId('redhat', major, advisoryRef.attrs.ref_id), {
          ...entry,
          kind: 'advisory',
          id: advisoryRef.attrs.ref_id,
          summary: text,
          cves: cves.map((cve) => cve.id),
        });
      }
    }
    pending.push({
      id: node.attrs.id,
      title: child(metadata, 'title')?.text ?? '',
      advisoryId: advisoryRef.attrs.ref_id,
      url: advisoryRef.attrs.ref_url,
      refs: refs.length > 0 ? refs : undefined,
      severity: (advisory && child(advisory, 'severity')?.text) || undefined,
      issued: dateToIso(advisory && child(advisory, 'issued')?.attrs.date),
      updated: dateToIso(advisory && child(advisory, 'updated')?.attrs.date),
      cves,
      resolution: unfixed ? resolution : undefined,
      leaves,
    });
  };

  await readOval(input, {
    keepText: new Set(['description', 'rights']),
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
        // OVAL's default operation is 'equals'.
        const operation = arch?.attrs.operation ?? 'equals';
        if (arch && (operation === 'equals' || operation === 'pattern match')) {
          stateArch.set(node.attrs.id, { operation, value: arch.text });
        } else if (arch) {
          unsupportedArchStates.add(node.attrs.id);
        }
      }
    },
  });

  const os = { family: 'rhel' as const, version: major };
  const records: AdvisoryRecord[] = [];
  for (const def of pending) {
    const supported = def.leaves.filter(({ leaf }) => {
      const stateRef = leaf.testRef ? testStates.get(leaf.testRef) : undefined;
      if (!stateRef || !unsupportedArchStates.has(stateRef)) return true;
      countInto(skipped, 'unsupported_arch_operation');
      return false;
    });
    for (const { leaf, arch, conditions } of mergeByArch(supported, (testRef) => {
      const stateRef = testStates.get(testRef);
      return stateRef ? stateArch.get(stateRef) : undefined;
    })) {
      let key: string | undefined;
      if (leaf.evr !== undefined) {
        try {
          key = rpmKey(leaf.evr);
        } catch (e) {
          if (!(e instanceof UnencodableVersionError)) throw e;
          countInto(skipped, 'unencodable_version_kept');
        }
      } else if (def.resolution?.get(leaf.name) === undefined) {
        // Informational: the vendor named no resolution state for this component.
        countInto(skipped, 'unfixed_without_reason');
      }
      records.push({
        advisory: {
          id: def.advisoryId,
          source: 'redhat',
          definition_id: def.id,
          title: def.title,
          url: def.url,
          severity: def.severity,
          published: def.issued,
          modified: def.updated,
          refs: def.refs,
        },
        os,
        kind: 'package',
        package: arch ? { name: leaf.name, arch } : { name: leaf.name },
        ...(leaf.unfixed
          ? { unfixed: true as const, vendor_reason: def.resolution?.get(leaf.name) }
          : { fixed_version: { raw: leaf.evr, scheme: 'rpm' as const, key } }),
        cves: def.cves,
        conditions,
        feed: { snapshot_time: snapshotTime },
      });
    }
  }

  return { os, snapshotTime, definitions, records, skipped, knowledge, attribution };
};
