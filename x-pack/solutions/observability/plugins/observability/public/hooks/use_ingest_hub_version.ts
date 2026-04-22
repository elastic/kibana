/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

const INGEST_HUB_VERSION_STORAGE_KEY = 'ingestHub:activeVersion';

function getStoredVersion(): string | null {
  try {
    return typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(INGEST_HUB_VERSION_STORAGE_KEY)
      : null;
  } catch {
    return null;
  }
}

/**
 * Returns the active Ingest Hub version and derived flags.
 * Syncs with sessionStorage and the ingestHubVersionChange custom event (no cross-plugin import).
 */
export function useIngestHubVersion(): {
  isSkipVersion: boolean;
  isAgentVersion: boolean;
  isVersion1: boolean;
  isVersion2: boolean;
} {
  const [version, setVersion] = useState<string | null>(() => getStoredVersion());

  useEffect(() => {
    setVersion(getStoredVersion());
    const handler = (e: CustomEvent<string>) => setVersion(e.detail);
    window.addEventListener('ingestHubVersionChange', handler as EventListener);
    return () => window.removeEventListener('ingestHubVersionChange', handler as EventListener);
  }, []);

  return {
    isSkipVersion:
      version === 'streamsUx' ||
      version === 'agentUx' ||
      version === 'version1' ||
      version === 'version2' ||
      version === 'version3',
    isAgentVersion:
      version === 'agentUx' ||
      version === 'version1' ||
      version === 'version2' ||
      version === 'version3',
    isVersion1: version === 'version1',
    isVersion2: version === 'version2',
  };
}
