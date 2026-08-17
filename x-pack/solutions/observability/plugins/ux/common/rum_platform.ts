/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RumAppPlatform = 'android' | 'ios' | 'web';

export interface RumApplicationOption {
  name: string;
  platform: RumAppPlatform;
}

const ANDROID_KEYS = new Set(['android']);
const IOS_KEYS = new Set(['ios', 'ipados', 'darwin']);

/** Prefer native platforms when a service name appears on more than one. */
export const preferRumAppPlatform = (
  current: RumAppPlatform | undefined,
  next: RumAppPlatform
): RumAppPlatform => {
  if (current === 'android' || next === 'android') {
    return 'android';
  }
  if (current === 'ios' || next === 'ios') {
    return 'ios';
  }
  return next;
};

/** Map rum.platform / os.type / os.name keys to a single app platform. */
export const resolveRumAppPlatform = (keys: Iterable<string>): RumAppPlatform => {
  let sawIos = false;
  for (const key of keys) {
    const normalized = key.trim().toLowerCase();
    if (ANDROID_KEYS.has(normalized)) {
      return 'android';
    }
    if (IOS_KEYS.has(normalized)) {
      sawIos = true;
    }
  }
  return sawIos ? 'ios' : 'web';
};

/**
 * App platform for the inventory icon.
 * rum.platform is the SDK. Session-index os.name is the visitor OS — one Android
 * phone must not flip a web app to native.
 */
export const platformKeysForInventory = ({
  rumPlatform,
  attrPlatform,
  osType,
  osName,
  hasWebVitals,
}: {
  rumPlatform: string[];
  attrPlatform: string[];
  osType: string[];
  osName: string[];
  hasWebVitals: boolean;
}): string[] => {
  if (rumPlatform.length > 0 || attrPlatform.length > 0) {
    return [...rumPlatform, ...attrPlatform];
  }
  if (hasWebVitals) {
    return ['web'];
  }
  const top = osName[0] ?? osType[0];
  return top ? [top] : [];
};
