/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UIPolicyConfig } from '../../../../../../common/endpoint/types';

export const PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION = Object.freeze({
  malware: '7.11+',
  ransomware: '7.12+',
  memory_protection: '7.15+',
  behavior_protection: '7.15+',
  ai_data_collection: '9.6+',
});

type NoticeProtection = keyof typeof PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION;

/** Operating systems that gained a protection later than the protection-wide minimum above. */
const PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION_BY_OS: Readonly<
  Partial<Record<NoticeProtection, Readonly<Partial<Record<keyof UIPolicyConfig, string>>>>>
> = Object.freeze({
  ransomware: Object.freeze({ mac: '9.4+', linux: '9.6+' }),
});

const isNoticeProtection = (protection: string): protection is NoticeProtection =>
  Object.hasOwn(PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION, protection);

/** Returns the minimum Endpoint version for a protection's notification, for one OS when given. */
export const getProtectionNoticeSupportedEndpointVersion = (
  protection: string,
  os?: keyof UIPolicyConfig
): string | undefined => {
  if (!isNoticeProtection(protection)) {
    return undefined;
  }
  const osVersion = os && PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION_BY_OS[protection]?.[os];
  return osVersion ?? PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION[protection];
};
