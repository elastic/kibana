/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '../../../../../common/endpoint/service/artifacts/constants';

export const PROTOTYPE_ARTIFACT_ITEM_IDS = {
  endpointException: 'prototype-exception-suspicious-powershell',
  trustedAppItTools: 'prototype-trusted-app-it-tools',
  trustedDeviceUsbKey: 'prototype-trusted-device-usb-key',
  trustedAppLegacyBackup: 'prototype-trusted-app-legacy-backup',
  blocklistEmotet: 'prototype-blocklist-emotet-hash',
  eventFilterCleanup: 'prototype-event-filter-cleanup-script',
} as const;

const daysAgoIso = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const createSampleItem = ({
  id,
  itemId,
  listId,
  name,
  description,
  updatedBy,
  updatedAt,
  entries,
  osTypes = ['windows'],
}: {
  id: string;
  itemId: string;
  listId: string;
  name: string;
  description: string;
  updatedBy: string;
  updatedAt: string;
  entries: ExceptionListItemSchema['entries'];
  osTypes?: ExceptionListItemSchema['os_types'];
}): ExceptionListItemSchema => ({
  _version: '1',
  id,
  item_id: itemId,
  list_id: listId,
  name,
  description,
  comments: [],
  created_at: updatedAt,
  created_by: updatedBy,
  updated_at: updatedAt,
  updated_by: updatedBy,
  entries,
  expire_time: undefined,
  meta: undefined,
  namespace_type: 'agnostic',
  os_types: osTypes,
  tags: [GLOBAL_ARTIFACT_TAG],
  tie_breaker_id: itemId,
  type: 'simple',
});

const PROTOTYPE_SAMPLE_ITEMS: ExceptionListItemSchema[] = [
  createSampleItem({
    id: 'prototype-sample-endpoint-exception',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.endpointException,
    listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
    name: 'Suspicious PowerShell Exception',
    description: 'Allows IT automation scripts while blocking known malicious patterns.',
    updatedBy: 'Brian M',
    updatedAt: daysAgoIso(3),
    entries: [
      {
        field: 'process.name',
        operator: 'included',
        type: 'match',
        value: 'powershell.exe',
      },
      {
        field: 'process.command_line',
        operator: 'included',
        type: 'match',
        value: '-ExecutionPolicy Bypass',
      },
    ],
  }),
  createSampleItem({
    id: 'prototype-sample-trusted-app-it-tools',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedAppItTools,
    listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
    name: 'IT Tools Manager',
    description: 'Trusted application used by the IT department for endpoint maintenance.',
    updatedBy: 'Brian M',
    updatedAt: daysAgoIso(7),
    entries: [
      {
        field: 'process.executable.caseless',
        operator: 'included',
        type: 'match',
        value: 'c:\\program files\\it tools\\manager.exe',
      },
    ],
  }),
  createSampleItem({
    id: 'prototype-sample-trusted-device-usb-key',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedDeviceUsbKey,
    listId: ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
    name: 'USB Security Key',
    description: 'Hardware security key approved for privileged access workflows.',
    updatedBy: 'Raquel T',
    updatedAt: daysAgoIso(14),
    entries: [
      {
        field: 'device.vendor.id',
        operator: 'included',
        type: 'match',
        value: '096e',
      },
      {
        field: 'device.product.id',
        operator: 'included',
        type: 'match',
        value: '0850',
      },
    ],
    osTypes: ['windows', 'macos', 'linux'],
  }),
  createSampleItem({
    id: 'prototype-sample-trusted-app-legacy-backup',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.trustedAppLegacyBackup,
    listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
    name: 'Legacy Backup Agent',
    description: 'Backup agent used by finance endpoints during scheduled maintenance windows.',
    updatedBy: 'Raquel T',
    updatedAt: daysAgoIso(30),
    entries: [
      {
        field: 'process.executable.caseless',
        operator: 'included',
        type: 'match',
        value: 'c:\\program files\\legacy backup\\agent.exe',
      },
    ],
  }),
  createSampleItem({
    id: 'prototype-sample-blocklist-emotet',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.blocklistEmotet,
    listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
    name: 'Emotet Hash Block',
    description: 'Blocks a known Emotet payload hash observed during incident response.',
    updatedBy: 'Roxana G',
    updatedAt: daysAgoIso(30),
    entries: [
      {
        field: 'process.hash.sha256',
        operator: 'included',
        type: 'match',
        value: '3f8a9c2d1b4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8',
      },
    ],
  }),
  createSampleItem({
    id: 'prototype-sample-event-filter-cleanup',
    itemId: PROTOTYPE_ARTIFACT_ITEM_IDS.eventFilterCleanup,
    listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
    name: 'Cleanup Script Filter',
    description: 'Filters noisy cleanup script events generated by endpoint maintenance jobs.',
    updatedBy: 'Roxana G',
    updatedAt: daysAgoIso(30),
    entries: [
      {
        field: 'process.name',
        operator: 'included',
        type: 'match',
        value: 'cleanup-script.exe',
      },
    ],
  }),
];

const PROTOTYPE_SAMPLE_ITEMS_BY_LIST_ID = PROTOTYPE_SAMPLE_ITEMS.reduce<
  Record<string, ExceptionListItemSchema[]>
>((acc, item) => {
  if (!acc[item.list_id]) {
    acc[item.list_id] = [];
  }
  acc[item.list_id].push(item);
  return acc;
}, {});

export const getPrototypeSampleItemsForList = (listId: string): ExceptionListItemSchema[] =>
  PROTOTYPE_SAMPLE_ITEMS_BY_LIST_ID[listId] ?? [];

export const hasPrototypeSampleItemsForList = (listId: string): boolean =>
  (PROTOTYPE_SAMPLE_ITEMS_BY_LIST_ID[listId]?.length ?? 0) > 0;
