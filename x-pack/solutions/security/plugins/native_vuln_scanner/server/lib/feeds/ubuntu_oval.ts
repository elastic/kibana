/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dpkgKey, UnencodableVersionError } from '../version_compare';
import { cveKnowledgeId } from '../knowledge/constants';
import { flatCopy, truncateText } from '../truncate';
import type { Atom, Conjunction, XmlNode } from './oval';
import {
  child,
  children,
  countInto,
  descendant,
  descendants,
  expandCriteria,
  groupByLeaf,
  ovalPublicToIso,
  ovalTimestampToIso,
  parseCvss,
  readOval,
  UnsupportedCriteriaError,
  type OvalInput,
} from './oval';
import type { AdvisoryCve, AdvisoryRecord, FeedParseResult, KnowledgeEntry } from './types';

/*
 * Canonical's OVAL has one definition per CVE. Each fixed source package is a criterion whose
 * dpkginfo_test names the source's binaries (constant_variable) and the fixed version
 * (dpkginfo_state evr, "less than"). Kernels are an AND of "is flavour X running" (uname
 * os_release pattern) and a variable_test comparing the running kernel ABI version with the fix.
 * Definitions precede tests, objects, states and variables in the file, so each section only
 * keeps the ids referenced by the sections before it.
 */

type UbuntuLeaf =
  | { type: 'package'; source: string; testRef: string; unfixed?: true }
  | { type: 'kernel'; flavour: string; testRef: string }
  | { type: 'kernel_presence'; flavour: string; testRef: string };

interface UbuntuCondition {
  testRef: string;
  /** Parsed from "Is kernel 'X' running?" so kernel-only branches keep the flavour name. */
  flavour?: string;
}

interface PendingDefinition {
  id: string;
  title: string;
  severity?: string;
  published?: string;
  refs?: Array<{ id: string; url: string }>;
  cve: AdvisoryCve;
  leaves: Array<{ leaf: UbuntuLeaf; conditions: UbuntuCondition[][] }>;
}

/**
 * Longest `pro fix` solution kept per CVE, in UTF-16 units. The text is a package-version list
 * (up to 16 KB, 60% of all Ubuntu prose) that the finding's own fixed version already carries.
 * Keeping it whole made the noble knowledge map retain ~115 MB; this bound keeps the command and
 * the first packages and lands the map near 60 MB. A cut sets `truncated`.
 */
export const UBUNTU_SOLUTION_MAX_CHARS = 1024;

const UPDATE_INSTRUCTIONS = /\s*Update Instructions:\s*/;
const REJECTED_PREFIX = /^Rejected reason:\s*/;

/**
 * Canonical packs the CVE description and the `pro fix` instructions into one `<description>`;
 * the instructions become the solution. A "Rejected reason:" description is the vendor
 * withdrawing the CVE.
 */
const splitUbuntuDescription = (
  node: XmlNode | undefined
):
  | {
      rejected: boolean;
      truncated: boolean;
      fields: Pick<KnowledgeEntry, 'description' | 'solution'>;
    }
  | undefined => {
  if (!node?.text) return undefined;
  const [before, ...rest] = node.text.split(UPDATE_INSTRUCTIONS);
  const fullSolution = rest.join(' ').trim();
  const solution = truncateText(fullSolution, UBUNTU_SOLUTION_MAX_CHARS);
  const rejected = REJECTED_PREFIX.test(before);
  const description = (rejected ? before.replace(REJECTED_PREFIX, '') : before).trim();
  return {
    rejected,
    // Splitting drops the heading, the solution may be cut and the rejected prefix is stripped,
    // so the text is an excerpt of the vendor's.
    truncated: node.truncated === true || fullSolution.length > 0 || rejected,
    // Both are slices of the one XML text; copying lets that parent (description + the full
    // solution) be collected instead of being pinned by every entry.
    fields: {
      description: description ? flatCopy(description) : undefined,
      solution: solution ? flatCopy(solution) : undefined,
    },
  };
};

const FIXED_PACKAGE = /^(\S+) source package in ([^,]+), is affected and has been fixed\b/;
const MIGHT_BE_AFFECTED = /^(\S+) source package in ([^,]+), might be affected\b/;
const KERNEL_RUNNING = /^Is kernel '([^']+)' running\?$/;
const KERNEL_FIXED = /^'([^']+)' kernel in \S+ was vulnerable but has been fixed\b/;

export interface ParseUbuntuOvalOptions {
  /** Release codename, e.g. `noble`. Criteria for other pockets (`esm-apps/noble`) are skipped. */
  release: string;
  /** Parse "might be affected" and kernel-flavour-only criteria into unfixed records. */
  includeUnfixed?: boolean;
}

export const parseUbuntuOval = async (
  input: OvalInput,
  { release, includeUnfixed }: ParseUbuntuOvalOptions
): Promise<FeedParseResult> => {
  const skipped: Record<string, number> = {};
  const pending: PendingDefinition[] = [];
  let definitions = 0;
  let snapshotTime: string | undefined;
  let attribution: string | undefined;
  const knowledge = new Map<string, KnowledgeEntry>();
  // The same reference URLs recur across thousands of CVEs; one string per URL.
  const urls = new Map<string, string>();
  const intern = (url: string): string => {
    const known = urls.get(url);
    if (known !== undefined) return known;
    const copy = flatCopy(url);
    urls.set(copy, copy);
    return copy;
  };

  const wantedTests = new Set<string>();
  const tests = new Map<string, { objectRef?: string; stateRef?: string }>();
  const wantedObjects = new Set<string>();
  const objects = new Map<string, { varRef?: string }>();
  const wantedStates = new Set<string>();
  const states = new Map<string, { value?: string; operation?: string; pattern?: string }>();
  const wantedVariables = new Set<string>();
  const variables = new Map<string, { values: string[]; prefix?: string; pattern?: string }>();

  const classify = (
    comment: string,
    testRef: string | undefined
  ): Atom<UbuntuLeaf, UbuntuCondition> => {
    const fixed = comment.match(FIXED_PACKAGE);
    if (fixed) {
      if (fixed[2] !== release) return { kind: 'false', reason: 'other_pocket' };
      if (!testRef) return { kind: 'false', reason: 'missing_test_ref' };
      return { kind: 'leaf', leaf: { type: 'package', source: fixed[1], testRef } };
    }
    if (MIGHT_BE_AFFECTED.test(comment)) {
      const might = comment.match(MIGHT_BE_AFFECTED);
      if (!includeUnfixed || !might || !testRef || might[2] !== release) {
        return { kind: 'false', reason: 'might_be_affected' };
      }
      return { kind: 'leaf', leaf: { type: 'package', source: might[1], testRef, unfixed: true } };
    }
    const kernelFixed = comment.match(KERNEL_FIXED);
    if (kernelFixed && testRef) {
      return { kind: 'leaf', leaf: { type: 'kernel', flavour: kernelFixed[1], testRef } };
    }
    if (KERNEL_RUNNING.test(comment) && testRef) {
      return {
        kind: 'condition',
        condition: { testRef, flavour: comment.match(KERNEL_RUNNING)?.[1] },
      };
    }
    return { kind: 'false', reason: 'unrecognised_criterion' };
  };

  const onDefinition = (node: XmlNode): void => {
    if (node.attrs.class !== 'vulnerability') return;
    definitions++;
    const metadata = child(node, 'metadata');
    const criteria = child(node, 'criteria');
    const cveNode = metadata && descendant(metadata, 'cve');
    if (!metadata || !criteria || !cveNode) {
      countInto(skipped, 'malformed_definition');
      return;
    }
    let conjunctions: Array<Conjunction<UbuntuLeaf, UbuntuCondition>>;
    try {
      conjunctions = expandCriteria<UbuntuLeaf, UbuntuCondition>(
        criteria,
        ({ comment, testRef, definitionRef }) =>
          // The only extend_definition is the "release is installed" applicability check.
          definitionRef ? { kind: 'true' } : classify(comment, testRef),
        (reason) => countInto(skipped, reason)
      );
    } catch (e) {
      if (!(e instanceof UnsupportedCriteriaError)) throw e;
      countInto(skipped, `criteria_${e.reason}`);
      return;
    }
    // Kernel-only branches ("Is kernel 'X' running?" alone) carry no leaf: groupByLeaf reports
    // them as `unfixed_kernel` skips. When includeUnfixed is on, the first flavour-ful
    // condition of each such branch becomes a presence record below, so claim those branches
    // here to keep the skip ledger from counting rows that do become records.
    const isKernelOnly = (conjunction: Conjunction<UbuntuLeaf, UbuntuCondition>): boolean =>
      conjunction.every((atom) => atom.kind === 'condition');
    const claimableKernelRefs = new Set<string>();
    if (includeUnfixed) {
      for (const conjunction of conjunctions) {
        if (!isKernelOnly(conjunction)) continue;
        for (const atom of conjunction) {
          if (atom.kind !== 'condition') continue;
          const { flavour, testRef } = atom.condition;
          if (flavour && !claimableKernelRefs.has(testRef)) claimableKernelRefs.add(testRef);
        }
      }
    }
    const grouped = groupByLeaf(
      conjunctions.filter(
        (c) =>
          !isKernelOnly(c) ||
          !c.some(
            (atom) => atom.kind === 'condition' && claimableKernelRefs.has(atom.condition.testRef)
          )
      ),
      (leaf) => leaf.testRef,
      (reason) => countInto(skipped, reason === 'no_leaf' ? 'unfixed_kernel' : reason)
    );
    if (includeUnfixed) {
      const synthesized = new Map<string, { leaf: UbuntuLeaf; conditions: UbuntuCondition[][] }>();
      for (const conjunction of conjunctions) {
        if (!isKernelOnly(conjunction)) continue;
        for (const atom of conjunction) {
          if (atom.kind !== 'condition') continue;
          const { flavour, testRef } = atom.condition;
          if (!flavour || synthesized.has(testRef)) continue;
          synthesized.set(testRef, {
            leaf: {
              type: 'kernel_presence',
              flavour,
              testRef,
            },
            conditions: [],
          });
        }
      }
      grouped.push(...synthesized.values());
    }
    if (grouped.length === 0) return;

    const { attrs } = cveNode;
    const refs: Array<{ id: string; url: string }> = [];
    let refsOverflowed = false;
    for (const { attrs: refAttrs } of children(metadata, 'reference')) {
      if (!refAttrs.ref_url) continue;
      if (refs.length === 10) {
        refsOverflowed = true;
        break;
      }
      refs.push({ id: refAttrs.ref_id ?? '', url: intern(refAttrs.ref_url.slice(0, 1024)) });
    }
    if (refsOverflowed) countInto(skipped, 'reference_overflow');
    attribution ??= descendant(metadata, 'rights')?.text || undefined;
    const advisory = child(metadata, 'advisory');
    const severity = advisory && child(advisory, 'severity')?.text;
    const publicDate = advisory && child(advisory, 'public_date')?.text;
    pending.push({
      id: node.attrs.id,
      title: child(metadata, 'title')?.text ?? '',
      severity: severity || undefined,
      published: publicDate || ovalPublicToIso(attrs.public),
      refs: refs.length > 0 ? refs : undefined,
      cve: {
        id: cveNode.text,
        url: attrs.href,
        published: ovalPublicToIso(attrs.public),
        severity: attrs.priority,
        cvss: parseCvss(attrs.cvss_score, attrs.cvss_vector, '3.1'),
        usns: attrs.usns ? attrs.usns.split(/[\s,]+/).filter(Boolean) : undefined,
      },
      leaves: grouped,
    });
    const text = splitUbuntuDescription(child(metadata, 'description'));
    if (text) {
      knowledge.set(cveKnowledgeId('ubuntu', release, cveNode.text), {
        kind: text.rejected ? 'rejected' : 'cve',
        id: cveNode.text,
        title: child(metadata, 'title')?.text || undefined,
        ...text.fields,
        url: attrs.href,
        severity: attrs.priority,
        references: refs.length > 0 ? refs.map((r) => r.url) : undefined,
        published: ovalPublicToIso(attrs.public),
        ...(text.truncated ? { truncated: true as const } : {}),
      });
    }
    for (const { leaf, conditions } of grouped) {
      wantedTests.add(leaf.testRef);
      for (const alternative of conditions) for (const c of alternative) wantedTests.add(c.testRef);
    }
  };

  const onTest = (node: XmlNode): void => {
    const { id } = node.attrs;
    if (!wantedTests.has(id)) return;
    const objectRef = child(node, 'object')?.attrs.object_ref;
    const stateRef = child(node, 'state')?.attrs.state_ref;
    tests.set(id, { objectRef, stateRef });
    if (objectRef) wantedObjects.add(objectRef);
    if (stateRef) wantedStates.add(stateRef);
  };

  const onObject = (node: XmlNode): void => {
    const { id } = node.attrs;
    if (!wantedObjects.has(id)) return;
    const varRef = child(node, 'name')?.attrs.var_ref ?? child(node, 'var_ref')?.text;
    objects.set(id, { varRef });
    if (varRef) wantedVariables.add(varRef);
  };

  const onState = (node: XmlNode): void => {
    const { id } = node.attrs;
    if (!wantedStates.has(id)) return;
    const evr = child(node, 'evr') ?? child(node, 'value');
    const osRelease = child(node, 'os_release');
    states.set(id, {
      value: evr?.text,
      operation: evr?.attrs.operation,
      pattern: osRelease?.attrs.operation === 'pattern match' ? osRelease.text : undefined,
    });
  };

  const onVariable = (node: XmlNode): void => {
    const { id } = node.attrs;
    if (!wantedVariables.has(id)) return;
    if (node.name === 'constant_variable') {
      variables.set(id, { values: children(node, 'value').map((v) => v.text) });
      return;
    }
    const literal = descendants(node, 'literal_component')[0]?.text;
    const capture = descendant(node, 'regex_capture')?.attrs.pattern;
    variables.set(id, { values: [], prefix: literal ?? '', pattern: capture });
  };

  await readOval(input, {
    keepText: new Set(['description', 'rights']),
    onTimestamp: (ts) => {
      snapshotTime = ovalTimestampToIso(ts);
    },
    onItem: (section, node) => {
      if (section === 'definitions') onDefinition(node);
      else if (section === 'tests') onTest(node);
      else if (section === 'objects') onObject(node);
      else if (section === 'states') onState(node);
      else onVariable(node);
    },
  });

  const lessThanState = (stateRef: string | undefined): string | undefined => {
    const state = stateRef ? states.get(stateRef) : undefined;
    return state?.operation === 'less than' && state.value ? state.value : undefined;
  };
  const variableFor = (testRef: string) => {
    const objectRef = tests.get(testRef)?.objectRef;
    const varRef = objectRef ? objects.get(objectRef)?.varRef : undefined;
    return varRef ? variables.get(varRef) : undefined;
  };
  const kernelPattern = (testRef: string): string | undefined => {
    const stateRef = tests.get(testRef)?.stateRef;
    return stateRef ? states.get(stateRef)?.pattern : undefined;
  };

  const os = { family: 'ubuntu' as const, version: release };
  const records: AdvisoryRecord[] = [];
  for (const def of pending) {
    for (const { leaf, conditions } of def.leaves) {
      const test = tests.get(leaf.testRef);
      const fixed = lessThanState(test?.stateRef);
      if (leaf.type === 'package' && leaf.unfixed) {
        // "might be affected" tests carry no fixed-version state; any installed binary matches.
        const variable = variableFor(leaf.testRef);
        if (!variable || variable.values.length === 0) {
          countInto(skipped, 'unresolved_binaries');
          continue;
        }
        records.push({
          advisory: {
            id: def.cve.id,
            source: 'ubuntu',
            definition_id: def.id,
            title: def.title,
            url: def.cve.url,
            severity: def.severity,
            published: def.published,
            refs: def.refs,
          },
          os,
          kind: 'package',
          package: { name: leaf.source, binaries: variable.values },
          unfixed: true,
          vendor_reason: 'might be affected',
          cves: [def.cve],
          conditions: [],
          feed: { snapshot_time: snapshotTime },
        });
        continue;
      }
      if (leaf.type === 'kernel_presence') {
        const pattern = kernelPattern(leaf.testRef);
        if (!pattern) {
          countInto(skipped, 'unresolved_kernel_condition');
          continue;
        }
        records.push({
          advisory: {
            id: def.cve.id,
            source: 'ubuntu',
            definition_id: def.id,
            title: def.title,
            url: def.cve.url,
            severity: def.severity,
            published: def.published,
            refs: def.refs,
          },
          os,
          kind: 'running_kernel',
          package: { name: leaf.flavour },
          unfixed: true,
          vendor_reason: 'might be affected',
          cves: [def.cve],
          conditions: [[{ type: 'kernel_release_matches', pattern }]],
          feed: { snapshot_time: snapshotTime },
        });
        continue;
      }
      if (!test || !fixed) {
        countInto(skipped, 'unresolved_fixed_version');
        continue;
      }
      const variable = variableFor(leaf.testRef);
      const resolvedConditions = conditions.map((alternative) =>
        alternative.map((c) => ({ testRef: c.testRef, pattern: kernelPattern(c.testRef) }))
      );
      if (resolvedConditions.some((alternative) => alternative.some((c) => !c.pattern))) {
        countInto(skipped, 'unresolved_kernel_condition');
        continue;
      }

      let packageField: AdvisoryRecord['package'];
      if (leaf.type === 'package') {
        if (!variable || variable.values.length === 0) {
          countInto(skipped, 'unresolved_binaries');
          continue;
        }
        packageField = { name: leaf.source, binaries: variable.values };
      } else {
        if (!variable?.pattern) {
          countInto(skipped, 'unresolved_kernel_version');
          continue;
        }
        packageField = {
          name: leaf.flavour,
          release_version: { prefix: variable.prefix ?? '', pattern: variable.pattern },
        };
      }

      let key: string | undefined;
      try {
        key = dpkgKey(fixed);
      } catch (e) {
        if (!(e instanceof UnencodableVersionError)) throw e;
        countInto(skipped, 'unencodable_version_kept');
      }

      records.push({
        advisory: {
          id: def.cve.id,
          source: 'ubuntu',
          definition_id: def.id,
          title: def.title,
          url: def.cve.url,
          severity: def.severity,
          published: def.published,
          refs: def.refs,
        },
        os,
        kind: leaf.type === 'package' ? 'package' : 'running_kernel',
        package: packageField,
        fixed_version: { raw: fixed, scheme: 'dpkg', key },
        cves: [def.cve],
        conditions: resolvedConditions.map((alternative) =>
          alternative.map((c) => ({
            type: 'kernel_release_matches' as const,
            pattern: c.pattern as string,
          }))
        ),
        feed: { snapshot_time: snapshotTime },
      });
    }
  }

  return { os, snapshotTime, definitions, records, skipped, knowledge, attribution };
};
