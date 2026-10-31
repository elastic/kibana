/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Per-application settings (repo routing). One saved object per service name. */
export const RUM_APP_SETTINGS_SO_TYPE = 'ux-rum-app';

export const RUM_APP_SETTINGS_API = '/internal/ux/rum/apps';

export const REPOSITORY_URL_MAX_LENGTH = 2048;
export const DEFAULT_BRANCH_MAX_LENGTH = 128;
export const SOURCE_ROOT_MAX_LENGTH = 512;
export const ISSUE_LABELS_MAX_LENGTH = 256;
export const RUM_APP_SERVICE_NAME_MAX_LENGTH = 256;

export interface RumAppSettings {
  serviceName: string;
  repositoryUrl: string;
  defaultBranch: string;
  sourceRoot: string;
  issueLabels: string;
}

export type RumAppSettingsBody = Omit<RumAppSettings, 'serviceName'>;

export const DEFAULT_RUM_APP_SETTINGS: RumAppSettingsBody = {
  repositoryUrl: '',
  defaultBranch: 'main',
  sourceRoot: '',
  issueLabels: '',
};

const SAFE_SO_ID = /^[a-zA-Z0-9._-]+$/;

/** Saved-object id for a service. Safe names are used as-is; others are hex-encoded. */
export const rumAppSettingsSoId = (serviceName: string): string => {
  const name = serviceName.trim();
  if (SAFE_SO_ID.test(name) && name.length > 0 && name.length <= RUM_APP_SERVICE_NAME_MAX_LENGTH) {
    return name;
  }
  const bytes = new TextEncoder().encode(name);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return `enc.${hex}`;
};

export const emptyRumAppSettings = (serviceName: string): RumAppSettings =>
  normalizeRumAppSettings(serviceName, {});

/** PUT body: service name lives in the path; the route rejects it on the body. */
export const rumAppSettingsBody = ({
  repositoryUrl,
  defaultBranch,
  sourceRoot,
  issueLabels,
}: RumAppSettings): RumAppSettingsBody => ({
  repositoryUrl,
  defaultBranch,
  sourceRoot,
  issueLabels,
});

/** Clamp/trim untrusted input to the persisted bounds. */
export const normalizeRumAppSettings = (
  serviceName: string,
  input: Partial<RumAppSettings>
): RumAppSettings => ({
  serviceName: serviceName.trim().slice(0, RUM_APP_SERVICE_NAME_MAX_LENGTH),
  repositoryUrl: String(input.repositoryUrl ?? '')
    .trim()
    .slice(0, REPOSITORY_URL_MAX_LENGTH),
  defaultBranch: (
    String(input.defaultBranch ?? '').trim() || DEFAULT_RUM_APP_SETTINGS.defaultBranch
  ).slice(0, DEFAULT_BRANCH_MAX_LENGTH),
  sourceRoot: String(input.sourceRoot ?? '')
    .trim()
    .replace(/^\/+/, '')
    .slice(0, SOURCE_ROOT_MAX_LENGTH),
  issueLabels: String(input.issueLabels ?? '')
    .trim()
    .slice(0, ISSUE_LABELS_MAX_LENGTH),
});

export const isHttpRepositoryUrl = (value: string): boolean => {
  if (!value) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
