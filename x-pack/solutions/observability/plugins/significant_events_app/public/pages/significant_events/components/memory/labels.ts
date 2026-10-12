/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MemoryArchiveReason, MemoryFilter } from './types';

const getMemoryFilterLabel = (filter: MemoryFilter): string => {
  switch (filter) {
    case 'active':
      return i18n.translate('xpack.significantEventsApp.memory.filter.active', {
        defaultMessage: 'Active',
      });
    case 'archived':
      return i18n.translate('xpack.significantEventsApp.memory.filter.archived', {
        defaultMessage: 'Archived',
      });
    case 'all':
    default:
      return i18n.translate('xpack.significantEventsApp.memory.filter.all', {
        defaultMessage: 'All',
      });
  }
};

/** Why a memory was retired. Each reason is set by a different actor. */
const getMemoryArchiveReasonLabel = (reason: MemoryArchiveReason): string => {
  switch (reason) {
    case 'merged':
      return i18n.translate('xpack.significantEventsApp.memory.archiveReason.merged', {
        defaultMessage: 'merged into another memory',
      });
    case 'harmful':
      return i18n.translate('xpack.significantEventsApp.memory.archiveReason.harmful', {
        defaultMessage: 'judged misleading',
      });
    case 'manual':
      return i18n.translate('xpack.significantEventsApp.memory.archiveReason.manual', {
        defaultMessage: 'archived by a person',
      });
    default:
      return i18n.translate('xpack.significantEventsApp.memory.archiveReason.unknown', {
        defaultMessage: 'archived',
      });
  }
};

export { getMemoryFilterLabel, getMemoryArchiveReasonLabel };
