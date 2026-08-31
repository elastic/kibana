/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';

export class InvalidMaintenanceWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMaintenanceWindowError';
  }
}

export interface ResolveMaintenanceWindowsResult {
  ids: string[];
  invalid: string[];
  ambiguous: string[];
}

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Resolves maintenance-window references (each an existing MW id or title) to
 * MW ids. Matches by id first, then by title (case-insensitive, trimmed) — the
 * same ordering used for private-location resolution. Titles that match more
 * than one MW are reported as ambiguous rather than guessed.
 */
export const resolveMaintenanceWindowRefs = (
  refs: string[],
  maintenanceWindows: MaintenanceWindow[]
): ResolveMaintenanceWindowsResult => {
  const ids: string[] = [];
  const invalid: string[] = [];
  const ambiguous: string[] = [];

  for (const ref of refs) {
    const byId = maintenanceWindows.find((mw) => mw.id === ref);
    if (byId) {
      ids.push(byId.id);
      continue;
    }

    const normalizedRef = normalize(ref);
    const byTitle = maintenanceWindows.filter(
      (mw) => mw.title && normalize(mw.title) === normalizedRef
    );

    if (byTitle.length === 1) {
      ids.push(byTitle[0].id);
    } else if (byTitle.length > 1) {
      ambiguous.push(ref);
    } else {
      invalid.push(ref);
    }
  }

  return { ids: [...new Set(ids)], invalid, ambiguous };
};

export const getInvalidMaintenanceWindowsError = ({
  invalid,
  ambiguous,
}: {
  invalid: string[];
  ambiguous: string[];
}) => {
  const invalidMsg = invalid.length
    ? i18n.translate('xpack.synthetics.maintenanceWindows.validation.invalid', {
        defaultMessage: `Couldn't find maintenance window(s) with id or name: {invalid}.`,
        values: { invalid: invalid.join(', ') },
      })
    : '';

  const ambiguousMsg = ambiguous.length
    ? i18n.translate('xpack.synthetics.maintenanceWindows.validation.ambiguous', {
        defaultMessage:
          'Maintenance window name(s) match more than one maintenance window: {ambiguous}. Reference them by id instead.',
        values: { ambiguous: ambiguous.join(', ') },
      })
    : '';

  return [invalidMsg, ambiguousMsg].filter(Boolean).join(' ');
};

/**
 * Resolves MW references to ids, throwing {@link InvalidMaintenanceWindowError}
 * when any reference is unknown or ambiguous. Empty/undefined input returns an
 * empty array.
 */
export const resolveMaintenanceWindowsOrThrow = (
  refs: string[] | undefined,
  maintenanceWindows: MaintenanceWindow[]
): string[] => {
  if (!refs || refs.length === 0) {
    return refs ?? [];
  }

  const { ids, invalid, ambiguous } = resolveMaintenanceWindowRefs(refs, maintenanceWindows);

  if (invalid.length || ambiguous.length) {
    throw new InvalidMaintenanceWindowError(
      getInvalidMaintenanceWindowsError({ invalid, ambiguous })
    );
  }

  return ids;
};
