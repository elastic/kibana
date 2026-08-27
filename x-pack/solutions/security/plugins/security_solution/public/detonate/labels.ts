/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ProtectionEventCode } from '../../common/detonate';

/** Friendly names for the endpoint protection that produced an alert. */
export const PROTECTION_LABELS: Record<ProtectionEventCode, string> = {
  malicious_file: i18n.translate('xpack.securitySolution.detonate.protection.maliciousFile', {
    defaultMessage: 'Malware',
  }),
  memory_signature: i18n.translate('xpack.securitySolution.detonate.protection.memorySignature', {
    defaultMessage: 'Memory threat',
  }),
  behavior: i18n.translate('xpack.securitySolution.detonate.protection.behavior', {
    defaultMessage: 'Behavior',
  }),
  shellcode_thread: i18n.translate('xpack.securitySolution.detonate.protection.shellcodeThread', {
    defaultMessage: 'Shellcode',
  }),
  ransomware: i18n.translate('xpack.securitySolution.detonate.protection.ransomware', {
    defaultMessage: 'Ransomware',
  }),
};

export const PROTECTION_COLORS: Record<ProtectionEventCode, string> = {
  malicious_file: 'danger',
  memory_signature: 'accent',
  behavior: 'primary',
  shellcode_thread: 'warning',
  ransomware: 'danger',
};

/** Event codes are raw enough that an unmapped one should still render readably. */
export const protectionLabel = (code: string): string =>
  PROTECTION_LABELS[code as ProtectionEventCode] ?? code;

const MACOS = i18n.translate('xpack.securitySolution.detonate.osFamily.macos', {
  defaultMessage: 'macOS',
});

/**
 * Operating systems the sandbox detonates on. Tasks record the kernel name, so `darwin` has to be
 * mapped to the name people recognise.
 */
const OS_FAMILY_LABELS: Record<string, string> = {
  windows: i18n.translate('xpack.securitySolution.detonate.osFamily.windows', {
    defaultMessage: 'Windows',
  }),
  linux: i18n.translate('xpack.securitySolution.detonate.osFamily.linux', {
    defaultMessage: 'Linux',
  }),
  darwin: MACOS,
  macos: MACOS,
};

export const osFamilyLabel = (osFamily: string): string =>
  OS_FAMILY_LABELS[osFamily.toLowerCase()] ?? osFamily;
