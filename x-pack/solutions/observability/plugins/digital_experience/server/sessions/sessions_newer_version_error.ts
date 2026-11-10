/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Thrown before any setup write when a newer Kibana installed the sessions transforms, e.g. after
 * a rollback or from an older node during a rolling upgrade. Enabling would replace the newer
 * transforms and delete their summaries.
 */
export class SessionsNewerVersionError extends Error {
  constructor(public readonly installedVersion: number, public readonly currentVersion: number) {
    super(
      i18n.translate('xpack.digitalExperience.sessions.api.newerVersion', {
        defaultMessage:
          'Sessions were set up by a newer Kibana (sessions version {installedVersion}, this Kibana supports version {currentVersion}). Upgrade Kibana to manage them.',
        values: { installedVersion, currentVersion },
      })
    );
    this.name = 'SessionsNewerVersionError';
  }
}
