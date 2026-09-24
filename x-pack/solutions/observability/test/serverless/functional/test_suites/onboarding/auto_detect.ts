/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { generateLongId, log, timerange } from '@kbn/synthtrace-client';
import moment from 'moment';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'svlCommonPage']);

  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
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
      // The command (and its copy button) only render after POST /flow resolves — that
      // request creates two API keys and looks up the latest Elastic Agent version, which
      // on a cold stack can exceed the default 10s find timeout, leaving the step on its
      // loading skeleton. Wait for the rendered command before clicking.
      // See https://github.com/elastic/kibana/issues/251086
      await testSubjects.existOrFail('observabilityOnboardingAutoDetectPanelCodeSnippet', {
        timeout: 60_000,
      });
      await testSubjects.clickWhenNotDisabled('observabilityOnboardingCopyToClipboardButton');
      const copiedCommand = await browser.getClipboardValue();

      const commandRegex =
        /sudo bash auto_detect\.sh --id=(\S+) --kibana-url=(\S+) --install-key=(\S+) --ingest-key=(\S+) --ea-version=(\S+)/;

      expect(copiedCommand).toMatch(commandRegex);

      const [, onboardingId, _kibanaUrl, installKey, _ingestKey, _eaVersion] =
        copiedCommand.match(commandRegex)!;

      // Simulate bash script installing detected integrations
      await supertestWithoutAuth
        .post(`/internal/observability_onboarding/flow/${onboardingId}/integrations/install`)
        .set('Authorization', `ApiKey ${installKey}`)
        .set('Content-Type', 'text/tab-separated-values')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('kbn-xsrf', 'true')
        .send('system\tregistry\ttest-host\n')
        .expect(200);

      // Simulate bash script installing Elastic Agent
      const agentId = generateLongId();
      await supertestWithoutAuth
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
