/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeCertProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const changeSearchField = async (text: string) => {
    const input = await testSubjects.find('uptimeCertSearch');
    await input.clearValueWithKeyboard();
    await input.type(text);
  };

  const refreshApp = async () => {
    await testSubjects.click('superDatePickerApplyTimeButton', 10000);
  };

  return {
    async isUptimeDataMissing() {
      return retry.tryForTime(60 * 1000, async () => {
        if (await testSubjects.exists('data-missing', { timeout: 0 })) {
          await refreshApp();
        }
        await testSubjects.missingOrFail('data-missing');
      });
    },
    async hasViewCertButton() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.existOrFail('uptimeCertificatesLink');
      });
    },
    async certificateExists(cert: { certId: string; monitorId: string }) {
      return retry.tryForTime(60 * 1000, async () => {
        if (!(await testSubjects.exists(cert.certId))) {
          await refreshApp();
        }
        await testSubjects.existOrFail(cert.certId);
        await testSubjects.existOrFail('monitor-page-link-' + cert.monitorId);
      });
    },
    async hasCertificates(expectedTotal?: number) {
      return retry.tryForTime(60 * 1000, async () => {
        const totalCerts = await testSubjects.getVisibleText('uptimeCertTotal');
        if (expectedTotal) {
          expect(Number(totalCerts)).to.eql(expectedTotal);
        } else {
          if (Number(totalCerts) < 1) {
            await refreshApp();
          }
          expect(Number(totalCerts) > 0).to.eql(true);
        }
      });
    },
    async searchIsWorking(monId: string) {
      const self = this;
      return retry.tryForTime(60 * 1000, async () => {
        await changeSearchField(monId);
        await self.hasCertificates(1);
      });
    },
  };
}
