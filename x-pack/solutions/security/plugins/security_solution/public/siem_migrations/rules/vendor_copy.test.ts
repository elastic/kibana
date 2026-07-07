/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationSource } from '../common/types';
import { RULE_MIGRATION_VENDOR_COPY } from './vendor_copy';

describe('RULE_MIGRATION_VENDOR_COPY', () => {
  it('contains copy for each supported migration vendor', () => {
    expect(RULE_MIGRATION_VENDOR_COPY).toMatchObject({
      [MigrationSource.SPLUNK]: {
        originalRule: {
          title: 'Splunk query',
          tooltip: 'This is the rule name detected in the export file uploaded for translation',
        },
        missingResources: {
          readyDescription:
            'You can also upload the missing macros & lookups for more accurate results.',
          uploadTitle: 'Upload missing macros and lookup lists.',
        },
        checkResources: {
          title: 'Check for macros and lookups',
          description:
            'For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.',
        },
      },
      [MigrationSource.QRADAR]: {
        originalRule: {
          title: 'QRadar rule definition',
          tooltip:
            'This is the original QRadar rule definition in XML format as exported from QRadar',
        },
        missingResources: {
          readyDescription:
            'You can also upload the missing reference sets and enhancements for more accurate results.',
          uploadTitle: 'Upload missing reference sets and rule enhancements',
        },
        checkResources: {
          title: 'Check for reference sets',
          description:
            'For best translation results, we will review the data for reference sets. If found, we will ask you to upload them next.',
        },
      },
      [MigrationSource.SENTINEL]: {
        originalRule: {
          title: 'Microsoft Sentinel rule definition',
          tooltip:
            'This is the original Microsoft Sentinel rule definition in ARM template JSON format as exported from Microsoft Sentinel',
        },
        missingResources: {
          readyDescription: 'You can also upload the missing watchlists for more accurate results.',
          uploadTitle: 'Upload missing watchlists',
        },
        checkResources: {
          title: 'Check for watchlists',
          description:
            'For best translation results, we will review the data for watchlists. If found, we will ask you to upload them next.',
        },
      },
    });
  });
});
