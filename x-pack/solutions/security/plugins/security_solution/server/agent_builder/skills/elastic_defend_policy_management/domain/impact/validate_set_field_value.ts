/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { set } from '@kbn/safer-lodash-set';
import {
  AntivirusRegistrationModes,
  DeviceControlAccessLevel,
  type PolicyOperatingSystem,
  ProtectionModes,
  type PolicyConfig,
  type UIPolicyConfig,
} from '../../../../../../common/endpoint/types';
import {
  getPolicyProtectionsReference,
  POLICY_COUPLING_MALWARE_BOOLEAN_FIELDS,
  POLICY_COUPLING_PROTECTIONS,
  setBehaviorReputationService,
  setCustomYaraSignatures,
  constrainLinuxTtyIo,
  setDeviceControlSwitch,
  setDeviceControlUsbStorage,
  setMalwareBoolean,
  setPopupEnabled,
  setProtectionModeAndPopup,
  type PolicyCouplingMalwareBooleanField,
  type PolicyCouplingProtection,
} from '../../../../../../common/endpoint/models/policy_config_helpers';
import { getControlledArtifactCutoffDate } from '../../../../../../common/endpoint/utils/controlled_artifact_rollout';
import { describePathWritability, getFieldRegistryEntry } from '../field_registry';
import { PolicyChangeRejectedError } from './policy_operation_rejection';
import type { PolicyChangeOperation } from './policy_change_operation';

export type SetFieldValueDomain =
  | { readonly type: 'enum'; readonly values: readonly string[] }
  | { readonly type: 'boolean' }
  | {
      readonly type: 'manifest_version';
      readonly keywords: readonly ['latest'];
      readonly earliest: string;
      readonly latest: string;
    }
  | { readonly type: 'string' }
  | { readonly type: 'number' };
type PolicyOsKey = keyof UIPolicyConfig;
interface RuleMatch {
  readonly os?: PolicyOsKey;
  readonly protection?: string;
  readonly field?: string;
}
type RuleKind = ClassifiedSetFieldValue['kind'];
interface SetFieldRule {
  readonly kind: RuleKind;
  readonly match: (path: string) => RuleMatch | undefined;
  readonly domain: (path: string) => SetFieldValueDomain;
  readonly createsMissing: boolean;
  readonly apply: (policy: PolicyConfig, path: string, value: unknown, match: RuleMatch) => void;
}
const bool = (): SetFieldValueDomain => ({ type: 'boolean' });
const protectionValues = Object.values(ProtectionModes);
const antivirusValues = Object.values(AntivirusRegistrationModes);
const deviceValues = Object.values(DeviceControlAccessLevel);
const protectionRef = (protection: string) =>
  getPolicyProtectionsReference().find(({ keyPath }) => keyPath === `${protection}.mode`);
const policyOsKey = (value: string | undefined): PolicyOsKey | undefined =>
  value === 'windows' || value === 'mac' || value === 'linux' ? value : undefined;
const regex =
  (pattern: RegExp) =>
  (path: string): RuleMatch | undefined => {
    const os = policyOsKey(pattern.exec(path)?.[1]);
    return os ? { os } : undefined;
  };
const genericDomain = (path: string): SetFieldValueDomain => {
  const type = typeof getFieldRegistryEntry(path)?.defaultValue;
  return type === 'boolean' || type === 'string' || type === 'number'
    ? { type }
    : { type: 'string' };
};
const rules: readonly SetFieldRule[] = [
  {
    kind: 'protection_mode',
    match: (path) => {
      const [os, protection, field] = path.split('.');
      const osKey = policyOsKey(os);
      return field === 'mode' &&
        osKey &&
        protection &&
        POLICY_COUPLING_PROTECTIONS.includes(protection as PolicyCouplingProtection) &&
        protectionRef(protection)?.osList.includes(os as PolicyOperatingSystem)
        ? { os: osKey, protection }
        : undefined;
    },
    domain: () => ({ type: 'enum', values: protectionValues }),
    createsMissing: false,
    apply: (policy, _path, value, match) => {
      const { protection, os } = match;
      if (protection === undefined || os === undefined)
        throw new Error('Invalid protection rule match');
      if (!protectionRef(protection)) throw new Error(`Unknown protection: ${protection}`);
      setProtectionModeAndPopup({
        policy,
        protection: protection as PolicyCouplingProtection,
        osList: [os],
        mode: value as ProtectionModes,
        syncPopupEnabled: false,
        popupEnabled: false,
      });
    },
  },
  {
    kind: 'custom_yara_signatures',
    match: (path) =>
      regex(/^(windows|mac|linux)\.memory_protection\.custom_yara_signatures$/)(path),
    domain: () => bool(),
    createsMissing: true,
    apply: (policy, _path, value) => {
      setCustomYaraSignatures(policy, value as boolean, ['windows', 'mac', 'linux']);
    },
  },
  {
    kind: 'antivirus_registration_mode',
    match: (path) => (path === 'windows.antivirus_registration.mode' ? {} : undefined),
    domain: () => ({ type: 'enum', values: antivirusValues }),
    createsMissing: false,
    apply: (policy, path, value) => {
      set(policy, path, value);
    },
  },
  {
    kind: 'device_control_enabled',
    match: regex(/^(windows|mac)\.device_control\.enabled$/),
    domain: () => bool(),
    createsMissing: true,
    apply: (policy, _path, value) => {
      setDeviceControlSwitch(policy, value as boolean);
    },
  },
  {
    kind: 'device_control_usb_storage',
    match: regex(/^(windows|mac)\.device_control\.usb_storage$/),
    domain: () => ({ type: 'enum', values: deviceValues }),
    createsMissing: false,
    apply: (policy, _path, value) => {
      setDeviceControlUsbStorage(policy, value as DeviceControlAccessLevel);
    },
  },
  {
    kind: 'popup_enabled',
    match: (path) => {
      const r = /^(windows|mac|linux)\.popup\.([^.]+)\.enabled$/.exec(path);
      return r && POLICY_COUPLING_PROTECTIONS.includes(r[2] as PolicyCouplingProtection)
        ? { protection: r[2] }
        : undefined;
    },
    domain: () => bool(),
    createsMissing: false,
    apply: (policy, _path, value, match) => {
      if (match.protection === undefined) throw new Error('Invalid popup rule match');
      const ref = protectionRef(match.protection);
      if (ref)
        setPopupEnabled(
          policy,
          match.protection as PolicyCouplingProtection,
          ref.osList,
          value as boolean
        );
    },
  },
  {
    kind: 'malware_boolean',
    match: (path) => {
      const r = /^(windows|mac|linux)\.malware\.([^.]+)$/.exec(path);
      return r &&
        POLICY_COUPLING_MALWARE_BOOLEAN_FIELDS.includes(r[2] as PolicyCouplingMalwareBooleanField)
        ? { field: r[2] }
        : undefined;
    },
    domain: () => bool(),
    createsMissing: false,
    apply: (policy, _path, value, match) => {
      setMalwareBoolean(
        policy,
        match.field as PolicyCouplingMalwareBooleanField,
        value as boolean,
        ['windows', 'mac', 'linux']
      );
    },
  },
  {
    kind: 'behavior_reputation_service',
    match: (path) =>
      /^(windows|mac|linux)\.behavior_protection\.reputation_service$/.test(path) ? {} : undefined,
    domain: () => bool(),
    createsMissing: false,
    apply: (policy, _path, value) => {
      setBehaviorReputationService(policy, value as boolean);
    },
  },
  {
    kind: 'linux_session_data',
    match: (path) => (path === 'linux.events.session_data' ? {} : undefined),
    domain: () => bool(),
    createsMissing: false,
    apply: (policy, _path, value) => {
      policy.linux.events.session_data = value as boolean;
      constrainLinuxTtyIo(policy);
    },
  },
  {
    kind: 'linux_tty_io',
    match: (path) => (path === 'linux.events.tty_io' ? {} : undefined),
    domain: () => bool(),
    createsMissing: false,
    apply: (policy, _path, value) => {
      policy.linux.events.tty_io = value as boolean;
    },
  },
  {
    kind: 'generic',
    match: () => ({}),
    domain: (path) =>
      path === 'global_manifest_version'
        ? {
            type: 'manifest_version',
            keywords: ['latest'],
            earliest: getControlledArtifactCutoffDate().format('YYYY-MM-DD'),
            latest: moment.utc().subtract(1, 'day').format('YYYY-MM-DD'),
          }
        : genericDomain(path),
    createsMissing: false,
    apply: (policy, path, value) => {
      set(policy, path, value);
    },
  },
];
export const getSetFieldRule = (
  path: string
): { rule: SetFieldRule; match: RuleMatch } | undefined => {
  for (const rule of rules) {
    const match = rule.match(path);
    if (match) return { rule, match };
  }
  return undefined;
};
export const getSetFieldValueDomain = (path: string): SetFieldValueDomain | undefined => {
  if (!describePathWritability(path).writable) return undefined;
  const found = getSetFieldRule(path);
  return found?.rule.domain(path);
};
export const canCreateMissingSetting = (path: string): boolean =>
  getSetFieldRule(path)?.rule.createsMissing === true;
export type ClassifiedSetFieldValue =
  | {
      readonly kind: 'protection_mode';
      readonly protection: PolicyCouplingProtection;
      readonly value: ProtectionModes;
    }
  | { readonly kind: 'antivirus_registration_mode'; readonly value: AntivirusRegistrationModes }
  | { readonly kind: 'device_control_enabled'; readonly value: boolean }
  | { readonly kind: 'device_control_usb_storage'; readonly value: DeviceControlAccessLevel }
  | { readonly kind: 'custom_yara_signatures'; readonly value: boolean }
  | {
      readonly kind: 'malware_boolean';
      readonly field: PolicyCouplingMalwareBooleanField;
      readonly value: boolean;
    }
  | { readonly kind: 'behavior_reputation_service'; readonly value: boolean }
  | {
      readonly kind: 'popup_enabled';
      readonly protection: PolicyCouplingProtection;
      readonly value: boolean;
    }
  | { readonly kind: 'linux_session_data'; readonly value: boolean }
  | { readonly kind: 'linux_tty_io'; readonly value: boolean }
  | { readonly kind: 'generic'; readonly value: unknown };
const rejectedValue = (path: string): PolicyChangeRejectedError =>
  new PolicyChangeRejectedError([
    {
      operationIndexes: [],
      path,
      reason: 'invalid_value',
      ...(getSetFieldValueDomain(path) ? { acceptedValues: getSetFieldValueDomain(path) } : {}),
    },
  ]);
export const classifySetFieldValue = (path: string, value: unknown): ClassifiedSetFieldValue => {
  const found = getSetFieldRule(path);
  const domain = getSetFieldValueDomain(path);
  const invalid =
    domain &&
    ((domain.type === 'enum' && (typeof value !== 'string' || !domain.values.includes(value))) ||
      (domain.type === 'boolean' && typeof value !== 'boolean') ||
      (domain.type === 'string' && typeof value !== 'string') ||
      (domain.type === 'number' && typeof value !== 'number') ||
      (domain.type === 'manifest_version' && typeof value !== 'string'));
  if (invalid) throw rejectedValue(path);
  if (!found) return { kind: 'generic', value };
  const { rule, match } = found;
  if (rule.kind === 'protection_mode')
    return {
      kind: rule.kind,
      protection: match.protection as PolicyCouplingProtection,
      value: value as ProtectionModes,
    };
  if (rule.kind === 'antivirus_registration_mode')
    return { kind: rule.kind, value: value as AntivirusRegistrationModes };
  if (rule.kind === 'malware_boolean')
    return {
      kind: rule.kind,
      field: match.field as PolicyCouplingMalwareBooleanField,
      value: value as boolean,
    };
  if (rule.kind === 'popup_enabled')
    return {
      kind: rule.kind,
      protection: match.protection as PolicyCouplingProtection,
      value: value as boolean,
    };
  if (rule.kind === 'generic') return { kind: rule.kind, value };
  return { kind: rule.kind, value: value as never } as ClassifiedSetFieldValue;
};
export const applySetFieldValue = (
  policy: PolicyConfig,
  operation: Extract<PolicyChangeOperation, { op: 'set_field' }>,
  classified?: ClassifiedSetFieldValue
): void => {
  const found = getSetFieldRule(operation.path);
  if (found)
    found.rule.apply(policy, operation.path, classified?.value ?? operation.value, found.match);
};
export const isDeviceControlEnabledPath = (path: string): boolean =>
  /^(windows|mac)\.device_control\.enabled$/.test(path);
export const isDeviceControlUsbPath = (path: string): boolean =>
  /^(windows|mac)\.device_control\.usb_storage$/.test(path);
export const isDevicePopupEnabledPath = (path: string): boolean =>
  /^(windows|mac)\.popup\.device_control\.enabled$/.test(path);
