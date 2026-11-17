/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isMap, isScalar, parseDocument } from 'yaml';
import type { RuntimePinConflict } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';

export type { RuntimePinConflict } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';

/** The only keys of `agent_internal` this plugin writes. */
export const RUNTIME_PIN_KEYS: ReadonlyArray<readonly string[]> = [
  ['agent', 'internal', 'runtime', 'default'],
  ['agent', 'internal', 'runtime', 'osquerybeat', 'default'],
  ['agent', 'internal', 'runtime', 'osquerybeat', 'osquery'],
];

export const RUNTIME_PIN_VALUE = 'process';

/** Machine-readable reason a policy's `agent_internal` cannot be edited. */
export type RuntimePinRefusalCode =
  | 'yaml_parse_error'
  | 'not_mapping'
  | 'not_string'
  | 'set_failed'
  | 'value_not_set';

export type RuntimePinMerge =
  | { ok: true; before: string; after: string; changed: boolean; conflicts: RuntimePinConflict[] }
  | { ok: false; before: string; key: string; code: RuntimePinRefusalCode; message: string };

const refusalDetail = (code: RuntimePinRefusalCode): string => {
  switch (code) {
    case 'yaml_parse_error':
      return i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused.yamlParseError', {
        defaultMessage: 'the YAML cannot be parsed',
      });
    case 'not_mapping':
      return i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused.notMapping', {
        defaultMessage: 'the document is not a YAML mapping',
      });
    case 'not_string':
      return i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused.notString', {
        defaultMessage: 'its value is not a string',
      });
    case 'set_failed':
      return i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused.setFailed', {
        defaultMessage: 'the value cannot be set at that path',
      });
    case 'value_not_set':
      return i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused.valueNotSet', {
        defaultMessage: 'the value did not persist after editing',
      });
  }
};

const refuse = (before: string, key: string, code: RuntimePinRefusalCode): RuntimePinMerge => ({
  ok: false,
  before,
  key,
  code,
  message: i18n.translate('xpack.nativeVulnScanner.onboarding.runtimePinRefused', {
    defaultMessage:
      'Cannot pin the osquerybeat runtime: "{key}" in the agent_internal settings of the policy is not editable ({detail}). Fix the YAML or remove the key and retry.',
    values: { key, detail: refusalDetail(code) },
  }),
});

/**
 * Sets the three osquerybeat runtime keys to `process` in an `agent_internal` YAML document and
 * touches nothing else (comments, ordering and unrelated keys survive). A document or path that
 * cannot be edited is refused with the offending key instead of being rewritten.
 */
export const mergeRuntimePin = (before: string | undefined | null): RuntimePinMerge => {
  const source = before ?? '';
  const doc = parseDocument(source);
  if (doc.errors.length > 0) {
    return refuse(source, RUNTIME_PIN_KEYS[0].join('.'), 'yaml_parse_error');
  }
  if (doc.contents !== null && !isMap(doc.contents)) {
    return refuse(source, 'agent', 'not_mapping');
  }
  const conflicts: RuntimePinConflict[] = [];
  let edited = false;
  for (const path of RUNTIME_PIN_KEYS) {
    const current = doc.getIn(path, true);
    const currentValue = isScalar(current) ? current.value : current;
    if (currentValue === RUNTIME_PIN_VALUE) continue;
    if (currentValue !== undefined && currentValue !== null && typeof currentValue !== 'string') {
      return refuse(source, path.join('.'), 'not_string');
    }
    try {
      // Setting through the scalar keeps its inline comment.
      if (isScalar(current)) current.value = RUNTIME_PIN_VALUE;
      else doc.setIn(path, RUNTIME_PIN_VALUE);
    } catch {
      return refuse(source, path.join('.'), 'set_failed');
    }
    edited = true;
    if (typeof currentValue === 'string') {
      conflicts.push({ key: path.join('.'), from: currentValue, to: RUNTIME_PIN_VALUE });
    }
  }
  // An untouched document is returned verbatim, so a second apply is byte-identical.
  const after = edited ? doc.toString() : source;
  // Re-check: a setIn that silently produced nothing would otherwise report success.
  const verify = parseDocument(after);
  for (const path of RUNTIME_PIN_KEYS) {
    if (verify.getIn(path) !== RUNTIME_PIN_VALUE) {
      return refuse(source, path.join('.'), 'value_not_set');
    }
  }
  return { ok: true, before: source, after, changed: after !== source, conflicts };
};
