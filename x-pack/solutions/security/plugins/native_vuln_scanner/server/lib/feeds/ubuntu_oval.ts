/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dpkgKey, UnencodableVersionError } from '../version_compare';
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
import type { AdvisoryCve, AdvisoryRecord, FeedParseResult } from './types';

/*
 * Canonical's OVAL has one definition per CVE. Each fixed source package is a criterion whose
 * dpkginfo_test names the source's binaries (constant_variable) and the fixed version
 * (dpkginfo_state evr, "less than"). Kernels are an AND of "is flavour X running" (uname
 * os_release pattern) and a variable_test comparing the running kernel ABI version with the fix.
 * Definitions precede tests, objects, states and variables in the file, so each section only
 * keeps the ids referenced by the sections before it.
 */

type UbuntuLeaf =
  | { type: 'package'; source: string; testRef: string }
  | { type: 'kernel'; flavour: string; testRef: string };

interface UbuntuCondition {
  testRef: string;
}

interface PendingDefinition {
  id: string;
  title: string;
  severity?: string;
  published?: string;
  cve: AdvisoryCve;
  leaves: Array<{ leaf: UbuntuLeaf; conditions: UbuntuCondition[][] }>;
}

const FIXED_PACKAGE = /^(\S+) source package in ([^,]+), is affected and has been fixed\b/;
const MIGHT_BE_AFFECTED = /^\S+ source package in [^,]+, might be affected\b/;
const KERNEL_RUNNING = /^Is kernel '([^']+)' running\?$/;
const KERNEL_FIXED = /^'([^']+)' kernel in \S+ was vulnerable but has been fixed\b/;

export interface ParseUbuntuOvalOptions {
  /** Release codename, e.g. `noble`. Criteria for other pockets (`esm-apps/noble`) are skipped. */
  release: string;
}

export const parseUbuntuOval = async (
  input: OvalInput,
  { release }: ParseUbuntuOvalOptions
): Promise<FeedParseResult> => {
  const skipped: Record<string, number> = {};
  const pending: PendingDefinition[] = [];
  let definitions = 0;
  let snapshotTime: string | undefined;

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
    if (MIGHT_BE_AFFECTED.test(comment)) return { kind: 'false', reason: 'might_be_affected' };
    const kernelFixed = comment.match(KERNEL_FIXED);
    if (kernelFixed && testRef) {
      return { kind: 'leaf', leaf: { type: 'kernel', flavour: kernelFixed[1], testRef } };
    }
    if (KERNEL_RUNNING.test(comment) && testRef)
      return { kind: 'condition', condition: { testRef } };
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
    const grouped = groupByLeaf(
      conjunctions,
      (leaf) => leaf.testRef,
      (reason) => countInto(skipped, reason === 'no_leaf' ? 'unfixed_kernel' : reason)
    );
    if (grouped.length === 0) return;

    const { attrs } = cveNode;
    const advisory = child(metadata, 'advisory');
    const severity = advisory && child(advisory, 'severity')?.text;
    const publicDate = advisory && child(advisory, 'public_date')?.text;
    pending.push({
      id: node.attrs.id,
      title: child(metadata, 'title')?.text ?? '',
      severity: severity || undefined,
      published: publicDate || ovalPublicToIso(attrs.public),
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

  return { os, snapshotTime, definitions, records, skipped };
};
