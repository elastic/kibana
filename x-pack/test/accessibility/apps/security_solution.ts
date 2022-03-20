/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const { common, detections } = getPageObjects(['common', 'detections']);
  const security = getService('security');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');

  // FLAKY: https://github.com/elastic/kibana/issues/95707
  describe.skip('Security Solution', () => {
    before(async () => {
      await security.testUser.setRoles(['superuser'], { skipBrowserRefresh: true });
      await common.navigateToApp('security');
    });

    after(async () => {
      await security.testUser.restoreDefaults({ skipBrowserRefresh: true });
    });

    describe('Detections', () => {
      describe('Create Rule Flow', () => {
        beforeEach(async () => {
          await detections.navigateToCreateRule();
        });

        describe('Custom Query Rule', () => {
          describe('Define Step', () => {
            it('default view meets a11y requirements', async () => {
              await toasts.dismissAllToasts();
              await testSubjects.click('customRuleType');
              await a11y.testAppSnapshot();
            });

            describe('import query modal', () => {
              it('contents of the default tab meets a11y requirements', async () => {
                await detections.openImportQueryModal();
                await a11y.testAppSnapshot();
              });

              it('contents of the templates tab meets a11y requirements', async () => {
                await common.scrollKibanaBodyTop();
                await detections.openImportQueryModal();
                await detections.viewTemplatesInImportQueryModal();
                await a11y.testAppSnapshot();
              });
            });

            it('preview section meets a11y requirements', async () => {
              await detections.addCustomQuery('_id');
              await detections.preview();
              await a11y.testAppSnapshot();
            });

            describe('About Step', () => {
              beforeEach(async () => {
                await detections.addCustomQuery('_id');
                await detections.continue('define');
              });

              it('default view meets a11y requirements', async () => {
                await a11y.testAppSnapshot();
              });

              it('advanced settings view meets a11y requirements', async () => {
                await detections.revealAdvancedSettings();
                await a11y.testAppSnapshot();
              });

              describe('Schedule Step', () => {
                beforeEach(async () => {
                  await detections.addNameAndDescription();
                  await detections.continue('about');
                });

                it('meets a11y requirements', async () => {
                  await a11y.testAppSnapshot();
                });

                describe('Actions Step', () => {
                  it('meets a11y requirements', async () => {
                    await detections.continue('schedule');
                    await a11y.testAppSnapshot();
                  });
                });
              });
            });
          });
        });

        describe('Machine Learning Rule First Step', () => {
          it('default view meets a11y requirements', async () => {
            await detections.selectMLRule();
            await a11y.testAppSnapshot();
          });
        });

        describe('Threshold Rule Rule First Step', () => {
          beforeEach(async () => {
            await detections.selectThresholdRule();
          });

          it('default view meets a11y requirements', async () => {
            await a11y.testAppSnapshot();
          });

          it('preview section meets a11y requirements', async () => {
            await detections.addCustomQuery('_id');
            await detections.preview();
            await a11y.testAppSnapshot();
          });
        });

        describe('Event Correlation Rule First Step', () => {
          beforeEach(async () => {
            await detections.selectEQLRule();
          });

          it('default view meets a11y requirements', async () => {
            await a11y.testAppSnapshot();
          });
        });

        describe('Indicator Match Rule First Step', () => {
          beforeEach(async () => {
            await detections.selectIndicatorMatchRule();
          });

          it('default view meets a11y requirements', async () => {
            await a11y.testAppSnapshot();
          });
        });
      });
    });
  });
}
