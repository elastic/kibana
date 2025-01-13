/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { type ExtendedScoutTestFixtures, test } from '../../fixtures';
import { CustomLogsPage } from '../../fixtures/page_objects/custom_logs';

const CUSTOM_INTEGRATION_NAME = 'mylogs';

function setupPage({ isAdmin }: { isAdmin: boolean }) {
  return async ({
    browserAuth,
    pageObjects: { customLogsPage },
    page,
  }: ExtendedScoutTestFixtures) => {
    await browserAuth.loginAsAdmin();
    await customLogsPage.deleteIntegration(CUSTOM_INTEGRATION_NAME);

    if (!isAdmin) {
      await browserAuth.loginAsPrivilegedUser();
      await page.reload();
    }

    await customLogsPage.deleteIntegration(CUSTOM_INTEGRATION_NAME);

    await customLogsPage.goto();
    await customLogsPage.logFilePathInput(0).fill('mylogs.log');
    await customLogsPage.continueButton.click();
  };
}

test.describe(
  'Onboarding app - Custom logs install Elastic Agent',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.describe('Custom integration', () => {
      test.beforeEach(setupPage({ isAdmin: true }));

      test('Users should be able to see the custom integration success callout', async ({
        pageObjects: { customLogsPage },
      }) => {
        await expect(customLogsPage.customIntegrationSuccessCallout).toBeVisible();
      });
    });

    test.describe('ApiKey generation', () => {
      test.describe('when user is missing privileges', () => {
        test.beforeEach(setupPage({ isAdmin: false }));

        test('apiKey is not generated', async ({ pageObjects: { customLogsPage } }) => {
          await expect(customLogsPage.apiKeyPrivilegesErrorCallout).toBeVisible();
        });
      });

      test.describe('when user has proper privileges', () => {
        test.beforeEach(setupPage({ isAdmin: true }));

        test('apiKey is generated', async ({ pageObjects: { customLogsPage } }) => {
          await expect(customLogsPage.apiKeyCreateSuccessCallout).toBeVisible();
        });
      });

      test.describe('when an error occurred on creation', () => {
        test.beforeEach(async ({ browserAuth, pageObjects: { customLogsPage }, page }) => {
          await page.route('**/observability_onboarding/logs/flow', (route) => {
            route.fulfill({
              status: 500,
              body: JSON.stringify({
                message: 'Internal error',
              }),
            });
          });
        });

        test.beforeEach(setupPage({ isAdmin: true }));

        test('apiKey is not generated', async ({ pageObjects: { customLogsPage } }) => {
          await expect(customLogsPage.apiKeyCreateErrorCallout).toBeVisible();
        });
      });
    });

    test.describe('Install the Elastic Agent step', () => {
      test.beforeEach(setupPage({ isAdmin: true }));

      test.describe('When user select Linux OS', () => {
        test('Auto download config to host is disabled by default', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.linuxCodeSnippetButton.click();
          await expect(customLogsPage.autoDownloadConfigurationToggle).not.toBeChecked();
        });

        test('Installation script is shown', async ({ pageObjects: { customLogsPage } }) => {
          await expect(customLogsPage.installCodeSnippet).toBeVisible();
        });
      });

      test.describe('When user select Mac OS', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          await customLogsPage.macOSCodeSnippetButton.click();
        });

        test('Auto download config to host is disabled by default', async ({
          pageObjects: { customLogsPage },
        }) => {
          await expect(customLogsPage.autoDownloadConfigurationToggle).not.toBeChecked();
        });

        test('Installation script is shown', async ({ pageObjects: { customLogsPage } }) => {
          await expect(customLogsPage.installCodeSnippet).toBeVisible();
        });
      });

      test.describe('When user select Windows OS', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          await customLogsPage.windowsCodeSnippetButton.click();
        });

        test('Auto download config to host is disabled by default', async ({
          pageObjects: { customLogsPage },
        }) => {
          await expect(customLogsPage.autoDownloadConfigurationToggle).not.toBeChecked();
        });

        test('A link to the documentation is shown instead of installation script', async ({
          pageObjects: { customLogsPage },
        }) => {
          await expect(customLogsPage.windowsInstallElasticAgentDocLink).toBeVisible();
          await expect(customLogsPage.installCodeSnippet).not.toBeVisible();
        });
      });

      test.describe('When Auto download config', () => {
        test.describe('is selected', () => {
          test('autoDownloadConfig flag is added to installation script', async ({
            pageObjects: { customLogsPage },
          }) => {
            await customLogsPage.autoDownloadConfigurationToggle.click();
            await expect(customLogsPage.autoDownloadConfigurationCallout).toBeVisible();
            await expect(customLogsPage.installCodeSnippet).toContainText('autoDownloadConfig=1');
          });

          test('Download config button is disabled', async ({
            pageObjects: { customLogsPage },
          }) => {
            await customLogsPage.autoDownloadConfigurationToggle.click();
            await expect(customLogsPage.downloadConfigurationButton).toBeDisabled();
          });
        });

        test('is not selected autoDownloadConfig flag is not added to installation script', async ({
          pageObjects: { customLogsPage },
        }) => {
          await expect(customLogsPage.installCodeSnippet).not.toContainText('autoDownloadConfig=1');
        });
      });

      test.describe('When user executes the installation script in the host', () => {
        let onboardingId: string;

        test.describe('updates on steps are shown in the flow', () => {
          test.beforeEach(async ({ page, pageObjects: { customLogsPage } }) => {
            await page.route('**/observability_onboarding/logs/flow', async (route) => {
              const response = await route.fetch();
              const body = await response.json();

              onboardingId = body.onboardingId;

              await route.fulfill({ response });
            });

            await expect(customLogsPage.apiKeyCreateSuccessCallout).toBeVisible();
          });

          test.describe('Download elastic Agent step', () => {
            test('shows a loading callout when elastic agent is downloading', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'loading'
              );
              await expect(
                customLogsPage.stepStatusLoading.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.DOWNLOADING_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a success callout when elastic agent is downloaded', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'complete'
              );
              await expect(
                customLogsPage.stepStatusComplete.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.DOWNLOADED_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a danger callout when elastic agent was not downloaded', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'danger'
              );
              await expect(
                customLogsPage.stepStatusDanger.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.DOWNLOAD_AGENT_DANGER_CALLOUT
                )
              ).toBeVisible();
            });
          });

          test.describe('Extract elastic Agent step', () => {
            test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'complete'
              );
            });

            test('shows a loading callout when elastic agent is extracting', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-extract',
                'loading'
              );
              await expect(
                customLogsPage.stepStatusLoading.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.EXTRACTING_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a success callout when elastic agent is extracted', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-extract',
                'complete'
              );
              await expect(
                customLogsPage.stepStatusComplete.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.EXTRACTED_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a danger callout when elastic agent was not extracted', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-extract',
                'danger'
              );
              await expect(
                customLogsPage.stepStatusDanger.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.EXTRACT_AGENT_DANGER_CALLOUT
                )
              ).toBeVisible();
            });
          });

          test.describe('Install elastic Agent step', () => {
            test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'complete'
              );
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-extract',
                'complete'
              );
            });

            test('shows a loading callout when elastic agent is installing', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-install',
                'loading'
              );
              await expect(
                customLogsPage.stepStatusLoading.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.INSTALLING_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a success callout when elastic agent is installed', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-install',
                'complete'
              );
              await expect(
                customLogsPage.stepStatusComplete.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.INSTALLED_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a danger callout when elastic agent was not installed', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-install',
                'danger'
              );
              await expect(
                customLogsPage.stepStatusDanger.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.INSTALL_AGENT_DANGER_CALLOUT
                )
              ).toBeVisible();
            });
          });

          test.describe('Check elastic Agent status step', () => {
            test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-download',
                'complete'
              );
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-extract',
                'complete'
              );
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-install',
                'complete'
              );
            });

            test('shows a loading callout when getting elastic agent status', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-status',
                'loading'
              );
              await expect(
                customLogsPage.stepStatusLoading.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.CONNECTING_TO_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a success callout when elastic agent status is healthy', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-status',
                'complete',
                {
                  agentId: 'test-agent-id',
                }
              );
              await expect(
                customLogsPage.stepStatusComplete.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.CONNECTED_TO_AGENT_STATUS
                )
              ).toBeVisible();
            });

            test('shows a warning callout when elastic agent status is not healthy', async ({
              pageObjects: { customLogsPage },
            }) => {
              await customLogsPage.updateInstallationStepStatus(
                onboardingId,
                'ea-status',
                'warning'
              );
              await expect(
                customLogsPage.stepStatusWarning.getByText(
                  CustomLogsPage.ASSERTION_MESSAGES.CONNECT_AGENT_WARNING_CALLOUT
                )
              ).toBeVisible();
            });
          });
        });
      });
    });

    test.describe('Configure Elastic Agent step', () => {
      let onboardingId: string;

      test.beforeEach(setupPage({ isAdmin: true }));

      test.beforeEach(async ({ page, pageObjects: { customLogsPage } }) => {
        await page.route('**/observability_onboarding/logs/flow', async (route) => {
          const response = await route.fetch();
          const body = await response.json();

          onboardingId = body.onboardingId;

          await route.fulfill({ response });
        });

        await expect(customLogsPage.apiKeyCreateSuccessCallout).toBeVisible();
      });

      test.describe('When user select Linux OS', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          await customLogsPage.autoDownloadConfigurationToggle.click();
          await customLogsPage.updateInstallationStepStatus(
            onboardingId,
            'ea-download',
            'complete'
          );
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
            agentId: 'test-agent-id',
          });
        });

        test('shows loading callout when config is being downloaded to the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'loading');
          await expect(
            customLogsPage.stepStatusLoading.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.DOWNLOAD_AGENT_CONFIG_STATUS
            )
          ).toBeVisible();
        });

        test('shows success callout when the configuration has been written to the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
          await expect(
            customLogsPage.stepStatusComplete.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.AGENT_CONFIGURATION_SUCCESS_CALLOUT_LINUX
            )
          ).toBeVisible();
        });

        test('shows warning callout when the configuration was not written in the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'warning');
          await expect(
            customLogsPage.stepStatusWarning.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.CONFIGURE_AGENT_WARNING_CALLOUT
            )
          ).toBeVisible();
        });
      });

      test.describe('When user select Mac OS', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          await customLogsPage.macOSCodeSnippetButton.click();
          await customLogsPage.autoDownloadConfigurationToggle.click();
          await customLogsPage.updateInstallationStepStatus(
            onboardingId,
            'ea-download',
            'complete'
          );
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
            agentId: 'test-agent-id',
          });
        });

        test('shows loading callout when config is being downloaded to the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'loading');
          await expect(
            customLogsPage.stepStatusLoading.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.DOWNLOADING_AGENT_CONFIG_STATUS
            )
          ).toBeVisible();
        });

        test('shows success callout when the configuration has been written to the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
          await expect(
            customLogsPage.stepStatusComplete.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.AGENT_CONFIGURATION_SUCCESS_CALLOUT_MACOS
            )
          ).toBeVisible();
        });

        test('shows warning callout when the configuration was not written in the host', async ({
          pageObjects: { customLogsPage },
        }) => {
          await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-config', 'warning');
          await expect(
            customLogsPage.stepStatusWarning.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.CONFIGURE_AGENT_WARNING_CALLOUT
            )
          ).toBeVisible();
        });
      });

      test.describe('When user select Windows', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          customLogsPage.windowsCodeSnippetButton.click();
        });

        test('step is disabled', async ({ pageObjects: { customLogsPage } }) => {
          await expect(
            customLogsPage.configureElasticAgentStep.getByText(
              CustomLogsPage.ASSERTION_MESSAGES.INSTALLATION_STEP_2_DISABLED
            )
          ).toBeVisible();
        });
      });
    });

    test.describe('Check logs step', () => {
      let onboardingId: string;

      test.beforeEach(setupPage({ isAdmin: true }));

      test.beforeEach(async ({ page, pageObjects: { customLogsPage } }) => {
        await page.route('**/observability_onboarding/logs/flow', async (route) => {
          const response = await route.fetch();
          const body = await response.json();

          onboardingId = body.onboardingId;

          await route.fulfill({ response });
        });

        await expect(customLogsPage.apiKeyCreateSuccessCallout).toBeVisible();
      });

      test.describe('When user select Linux OS or MacOS', () => {
        test.describe('When configure Elastic Agent step is not finished', () => {
          test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-download',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-extract',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-install',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(onboardingId, 'ea-status', 'loading');
          });

          test('check logs is not triggered', async ({ page }) => {
            await expect(
              page.locator(
                '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-incomplete"]'
              )
            ).toBeVisible();
            await expect(
              page.locator('.euiStep__title', { hasText: 'Ship logs to Elastic Observability' })
            ).toBeVisible();
          });
        });

        test.describe('When configure Elastic Agent step has finished', () => {
          test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-download',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-extract',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-install',
              'complete'
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-status',
              'complete',
              {
                agentId: 'test-agent-id',
              }
            );
            await customLogsPage.updateInstallationStepStatus(
              onboardingId,
              'ea-config',
              'complete'
            );
          });

          test('shows loading callout when logs are being checked', async ({ page }) => {
            await expect(
              page.locator(
                '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-loading"]'
              )
            ).toBeVisible();
            await expect(
              page.locator('.euiStep__title', { hasText: 'Waiting for logs to be shipped...' })
            ).toBeVisible();
          });
        });
      });

      test.describe('When user select Windows', () => {
        test.beforeEach(async ({ pageObjects: { customLogsPage } }) => {
          await customLogsPage.windowsCodeSnippetButton.click();
        });

        test('step is disabled', async ({ pageObjects: { customLogsPage }, page }) => {
          await expect(
            page.locator(
              '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-disabled"]'
            )
          ).toBeVisible();
        });
      });
    });

    test.describe('When logs are being shipped', () => {
      test.beforeEach(async ({ page }) => {
        await page.route('**/progress', (route) => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              progress: {
                'ea-download': { status: 'complete' },
                'ea-extract': { status: 'complete' },
                'ea-install': { status: 'complete' },
                'ea-status': { status: 'complete' },
                'ea-config': { status: 'complete' },
                'logs-ingest': { status: 'complete' },
              },
            }),
          });
        });
      });

      test.beforeEach(setupPage({ isAdmin: true }));

      test('shows success callout when logs have arrived to elastic', async ({ page }) => {
        await expect(
          page.locator(
            '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-complete"]'
          )
        ).toBeVisible();
        await expect(
          page.locator('.euiStep__title', { hasText: 'Logs are being shipped!' })
        ).toBeVisible();
      });

      test('when user clicks on Explore Logs it navigates to observability Discover', async ({
        page,
      }) => {
        await page.locator('[data-test-subj="obltOnboardingExploreLogs"]').click();
        await expect(page).toHaveURL(/\/app\/discover/);
      });
    });
  }
);
