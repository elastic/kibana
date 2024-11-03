/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { generateLongId, log, timerange } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'datasetQuality',
    'observabilityLogsExplorer',
    'common',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);

  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const synthtrace = getService('svlLogsSynthtraceClient');

  describe('Onboarding Auto-Detect', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin(); // Onboarding requires admin role
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'observabilityOnboarding',
        '/auto-detect/',
        '?category=logs',
        {
          ensureCurrentUrl: false, // the check sometimes is too slow for the page so it misses the point in time before the app rewrites the URL
        }
      );
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('guides user through data onboarding', async () => {
      await testSubjects.clickWhenNotDisabled('observabilityOnboardingCopyToClipboardButton');
      const copiedCommand = await browser.getClipboardValue();

      const commandRegex =
        /sudo bash auto_detect\.sh --id=(\S+) --kibana-url=(\S+) --install-key=(\S+) --ingest-key=(\S+) --ea-version=(\S+)/;

      expect(copiedCommand).toMatch(commandRegex);

      const [, onboardingId, _kibanaUrl, installKey, _ingestKey, _eaVersion] =
        copiedCommand.match(commandRegex)!;

      // Simulate bash script installing detected integrations
      await supertest
        .post(`/internal/observability_onboarding/flow/${onboardingId}/integrations/install`)
        .set('Authorization', `ApiKey ${installKey}`)
        .set('Content-Type', 'text/tab-separated-values')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('kbn-xsrf', 'true')
        .send('system\tregistry\ttest-host\n')
        .expect(200);

      // Simulate bash script installing Elastic Agent
      const agentId = generateLongId();
      await supertest
        .post(`/internal/observability_onboarding/flow/${onboardingId}/step/ea-status`)
        .set('Authorization', `ApiKey ${installKey}`)
        .set('x-elastic-internal-origin', 'Kibana')
        .set('kbn-xsrf', 'true')
        .send({ status: 'complete', message: '', payload: { agentId } })
        .expect(200);

      // Simulate Elastic Agent ingesting log files
      const to = new Date().toISOString();
      const count = 1;
      await synthtrace.index(
        timerange(moment(to).subtract(count, 'minute'), moment(to))
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            return log.create().dataset('system.syslog').timestamp(timestamp).defaults({
              'agent.id': agentId,
            });
          })
      );

      // Wait for logs to be ingested
      await testSubjects.existOrFail(
        'observabilityOnboardingAutoDetectPanelDataReceivedProgressIndicator'
      );
    });
  });
}
