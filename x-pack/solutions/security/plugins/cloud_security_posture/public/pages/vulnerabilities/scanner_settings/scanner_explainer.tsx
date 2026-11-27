/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { SCANNER_SETTINGS_TEST_SUBJECTS } from './test_subjects';

export const ScannerExplainer = () => (
  <KbnInfoCallout
    announceOnMount={false}
    title={i18n.translate('xpack.csp.nativeVulnScanner.explainer.title', {
      defaultMessage: 'Scan hosts for vulnerabilities with Elastic Agent',
    })}
    data-test-subj={SCANNER_SETTINGS_TEST_SUBJECTS.EXPLAINER}
    text={
      <>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.explainer.inventory', {
            defaultMessage:
              'Once a day, Osquery reads the installed package list (deb and rpm) with the OS release and kernel version on Linux, and the OS build and installed updates on Windows. The scanner matches that inventory against vendor vulnerability feeds.',
          })}
        </p>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.explainer.coverage', {
            defaultMessage:
              'It covers Ubuntu, RHEL 8 and later, and Windows releases that have a vendor feed. The feeds are downloaded daily from Canonical, Red Hat and Microsoft. CVEs on the CISA Known Exploited Vulnerabilities list are flagged.',
          })}
        </p>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.explainer.requirements', {
            defaultMessage:
              'Hosts must run Elastic Agent with the Osquery Manager integration. The first findings arrive within about a day.',
          })}
        </p>
        <p>
          {i18n.translate('xpack.csp.nativeVulnScanner.explainer.limits', {
            defaultMessage:
              'It does not match language packages and does not cover containers or macOS.',
          })}
        </p>
      </>
    }
  />
);
