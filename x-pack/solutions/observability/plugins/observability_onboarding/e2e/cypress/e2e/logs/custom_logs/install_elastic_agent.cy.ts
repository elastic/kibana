/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('[Logs onboarding] Custom logs - install elastic agent', () => {
  const CUSTOM_INTEGRATION_NAME = 'mylogs';

  const configureCustomLogs = (loginFn = () => cy.loginAsLogMonitoringUser()) => {
    loginFn();
    cy.visitKibana('/app/observabilityOnboarding/customLogs');

    cy.deleteIntegration(CUSTOM_INTEGRATION_NAME);

    cy.getByTestSubj('obltOnboardingLogFilePath-0').find('input').type('mylogs.log');

    cy.getByTestSubj('obltOnboardingCustomLogsContinue').click();
  };

  describe('custom integration', () => {
    beforeEach(() => {
      configureCustomLogs(() => cy.loginAsEditorUser());
    });

    it('Users should be able to see the custom integration success callout', () => {
      cy.getByTestSubj('obltOnboardingCustomIntegrationInstalled').should('be.visible');
    });
  });

  describe('ApiKey generation', () => {
    describe('when user is missing privileges', () => {
      beforeEach(() => {
        configureCustomLogs(() => cy.loginAsEditorUser());
      });

      it('apiKey is not generated', () => {
        cy.getByTestSubj('obltOnboardingLogsApiKeyCreationNoPrivileges').should('exist');
      });
    });

    describe('when user has proper privileges', () => {
      beforeEach(() => {
        configureCustomLogs();
      });

      it('apiKey is generated', () => {
        cy.getByTestSubj('obltOnboardingLogsApiKeyCreated').should('exist');
      });
    });

    describe('when an error occurred on creation', () => {
      before(() => {
        cy.intercept('/internal/observability_onboarding/logs/flow', {
          statusCode: 500,
          body: {
            message: 'Internal error',
          },
        });

        configureCustomLogs();
      });

      it('apiKey is not generated', () => {
        cy.getByTestSubj('obltOnboardingLogsApiKeyCreationFailed').should('exist');
      });
    });
  });

  describe('Install the Elastic Agent step', () => {
    beforeEach(() => {
      cy.intercept('POST', '/internal/observability_onboarding/logs/flow').as(
        'createOnboardingFlow'
      );
      configureCustomLogs();
    });

    describe('When user select Linux OS', () => {
      it('Auto download config to host is disabled by default', () => {
        cy.get('.euiButtonGroup').contains('Linux').click();
        cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig')
          .should('be.enabled')
          .should('not.be.checked');
      });

      it('Installation script is shown', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentStep')
          .get('.euiCodeBlock')
          .should('exist');
      });
    });

    describe('When user select Mac OS', () => {
      beforeEach(() => {
        cy.get('.euiButtonGroup').contains('MacOS').click();
      });

      it('Auto download config to host is disabled by default', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig')
          .should('be.enabled')
          .should('not.be.checked');
      });

      it('Installation script is shown', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentStep')
          .get('.euiCodeBlock')
          .should('exist');
      });
    });

    describe('When user select Windows OS', () => {
      beforeEach(() => {
        cy.get('.euiButtonGroup').contains('Windows').click();
      });

      it('Auto download config to host is disabled by default', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig')
          .should('be.disabled')
          .should('not.be.checked');
      });

      it('A link to the documentation is shown instead of installation script', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentWindowsDocsLink').should('exist');

        cy.getByTestSubj('obltOnboardingInstallElasticAgentStep')
          .get('.euiCodeBlock')
          .should('not.exist');
      });
    });

    describe('When Auto download config', () => {
      describe('is selected', () => {
        it('autoDownloadConfig flag is added to installation script', () => {
          cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig').click();
          cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfigCallout').should(
            'exist'
          );
          cy.getByTestSubj('obltOnboardingInstallElasticAgentStep')
            .get('.euiCodeBlock')
            .should('contain', 'autoDownloadConfig=1');
        });

        it('Download config button is disabled', () => {
          cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig').click();
          cy.getByTestSubj('obltOnboardingConfigureElasticAgentStepDownloadConfig').should(
            'be.disabled'
          );
        });
      });

      it('is not selected autoDownloadConfig flag is not added to installation script', () => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentStep')
          .get('.euiCodeBlock')
          .should('not.contain', 'autoDownloadConfig=1');
      });
    });

    describe('When user executes the installation script in the host', () => {
      let onboardingId: string;

      describe('updates on steps are shown in the flow', () => {
        beforeEach(() => {
          cy.wait('@createOnboardingFlow')
            .its('response.body')
            .then((body) => {
              onboardingId = body.onboardingId;
            });
        });

        describe('Download elastic Agent step', () => {
          it('shows a loading callout when elastic agent is downloading', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'loading');
            cy.getByTestSubj('obltOnboardingStepStatus-loading')
              .contains('Downloading Elastic Agent')
              .should('exist');
          });

          it('shows a success callout when elastic agent is downloaded', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
            cy.getByTestSubj('obltOnboardingStepStatus-complete')
              .contains('Elastic Agent downloaded')
              .should('exist');
          });

          it('shows a danger callout when elastic agent was not downloaded', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'danger');
            cy.getByTestSubj('obltOnboardingStepStatus-danger')
              .contains('Download Elastic Agent')
              .should('exist');
          });
        });

        describe('Extract elastic Agent step', () => {
          beforeEach(() => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
          });

          it('shows a loading callout when elastic agent is extracting', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'loading');
            cy.getByTestSubj('obltOnboardingStepStatus-loading')
              .contains('Extracting Elastic Agent')
              .should('exist');
          });

          it('shows a success callout when elastic agent is extracted', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
            cy.getByTestSubj('obltOnboardingStepStatus-complete')
              .contains('Elastic Agent extracted')
              .should('exist');
          });

          it('shows a danger callout when elastic agent was not extracted', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'danger');
            cy.getByTestSubj('obltOnboardingStepStatus-danger')
              .contains('Extract Elastic Agent')
              .should('exist');
          });
        });

        describe('Install elastic Agent step', () => {
          beforeEach(() => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
            cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
          });

          it('shows a loading callout when elastic agent is installing', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'loading');
            cy.getByTestSubj('obltOnboardingStepStatus-loading')
              .contains('Installing Elastic Agent')
              .should('exist');
          });

          it('shows a success callout when elastic agent is installed', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
            cy.getByTestSubj('obltOnboardingStepStatus-complete')
              .contains('Elastic Agent installed')
              .should('exist');
          });

          it('shows a danger callout when elastic agent was not installed', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'danger');
            cy.getByTestSubj('obltOnboardingStepStatus-danger')
              .contains('Install Elastic Agent')
              .should('exist');
          });
        });

        describe('Check elastic Agent status step', () => {
          beforeEach(() => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
            cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
            cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
          });

          it('shows a loading callout when getting elastic agent status', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'loading');
            cy.getByTestSubj('obltOnboardingStepStatus-loading')
              .contains('Connecting to the Elastic Agent')
              .should('exist');
          });

          it('shows a success callout when elastic agent status is healthy', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
              agentId: 'test-agent-id',
            });
            cy.getByTestSubj('obltOnboardingStepStatus-complete')
              .contains('Connected to the Elastic Agent')
              .should('exist');
          });

          it('shows a warning callout when elastic agent status is not healthy', () => {
            cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'warning');
            cy.getByTestSubj('obltOnboardingStepStatus-warning')
              .contains('Connect to the Elastic Agent')
              .should('exist');
          });
        });
      });
    });
  });

  describe('Configure Elastic Agent step', () => {
    let onboardingId: string;

    beforeEach(() => {
      cy.intercept('POST', '/internal/observability_onboarding/logs/flow').as(
        'createOnboardingFlow'
      );
      configureCustomLogs();
      cy.wait('@createOnboardingFlow')
        .its('response.body')
        .then((body) => {
          onboardingId = body.onboardingId;
        });
    });

    describe('When user select Linux OS', () => {
      beforeEach(() => {
        cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig').click();
        cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
          agentId: 'test-agent-id',
        });
      });

      it('shows loading callout when config is being downloaded to the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'loading');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-loading"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-loading')
          .contains('Downloading Elastic Agent config')
          .should('exist');
      });

      it('shows success callout when the configuration has been written to the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-complete"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-complete')
          .contains('Elastic Agent config written to /opt/Elastic/Agent/elastic-agent.yml')
          .should('exist');
      });

      it('shows warning callout when the configuration was not written in the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'warning');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-warning"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-warning')
          .contains('Configure the agent')
          .should('exist');
      });
    });

    describe('When user select Mac OS', () => {
      beforeEach(() => {
        cy.get('.euiButtonGroup').contains('MacOS').click();
        cy.getByTestSubj('obltOnboardingInstallElasticAgentAutoDownloadConfig').click();
        cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
        cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
          agentId: 'test-agent-id',
        });
      });

      it('shows loading callout when config is being downloaded to the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'loading');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-loading"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-loading')
          .contains('Downloading Elastic Agent config')
          .should('exist');
      });

      it('shows success callout when the configuration has been written to the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-complete"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-complete')
          .contains('Elastic Agent config written to /Library/Elastic/Agent/elastic-agent.yml')
          .should('exist');
      });

      it('shows warning callout when the configuration was not written in the host', () => {
        cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'warning');
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-warning"]'
        ).should('exist');
        cy.getByTestSubj('obltOnboardingStepStatus-warning')
          .contains('Configure the agent')
          .should('exist');
      });
    });

    describe('When user select Windows', () => {
      beforeEach(() => {
        cy.get('.euiButtonGroup').contains('Windows').click();
      });

      it('step is disabled', () => {
        cy.get(
          '[data-test-subj="obltOnboardingConfigureElasticAgentStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-disabled"]'
        ).should('exist');
      });
    });
  });

  describe('Check logs step', () => {
    let onboardingId: string;

    beforeEach(() => {
      cy.intercept('POST', '/internal/observability_onboarding/logs/flow').as(
        'createOnboardingFlow'
      );
      configureCustomLogs();
      cy.wait('@createOnboardingFlow')
        .its('response.body')
        .then((body) => {
          onboardingId = body.onboardingId;
        });
    });

    describe('When user select Linux OS or MacOS', () => {
      describe('When configure Elastic Agent step is not finished', () => {
        beforeEach(() => {
          cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'loading');
        });

        it('check logs is not triggered', () => {
          cy.get(
            '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-incomplete"]'
          ).should('exist');
          cy.get('.euiStep__title').contains('Ship logs to Elastic Observability').should('exist');
        });
      });

      describe('When configure Elastic Agent step has finished', () => {
        beforeEach(() => {
          cy.updateInstallationStepStatus(onboardingId, 'ea-download', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-extract', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-install', 'complete');
          cy.updateInstallationStepStatus(onboardingId, 'ea-status', 'complete', {
            agentId: 'test-agent-id',
          });
          cy.updateInstallationStepStatus(onboardingId, 'ea-config', 'complete');
        });

        it('shows loading callout when logs are being checked', () => {
          cy.get(
            '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-loading"]'
          ).should('exist');
          cy.get('.euiStep__title').contains('Waiting for logs to be shipped...').should('exist');
        });
      });
    });

    describe('When user select Windows', () => {
      beforeEach(() => {
        cy.get('.euiButtonGroup').contains('Windows').click();
      });

      it('step is disabled', () => {
        cy.get(
          '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-disabled"]'
        ).should('exist');
      });
    });
  });

  describe('When logs are being shipped', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/progress', {
        status: 200,
        body: {
          progress: {
            'ea-download': { status: 'complete' },
            'ea-extract': { status: 'complete' },
            'ea-install': { status: 'complete' },
            'ea-status': { status: 'complete' },
            'ea-config': { status: 'complete' },
            'logs-ingest': { status: 'complete' },
          },
        },
      }).as('checkOnboardingProgress');
      configureCustomLogs();
    });

    it('shows success callout when logs has arrived to elastic', () => {
      cy.wait('@checkOnboardingProgress');
      cy.get(
        '[data-test-subj="obltOnboardingCheckLogsStep"] .euiStep__titleWrapper [class$="euiStepNumber-s-complete"]'
      ).should('exist');
      cy.get('.euiStep__title').contains('Logs are being shipped!').should('exist');
    });

    it('when user clicks on Explore Logs it navigates to observability logs explorer', () => {
      cy.wait('@checkOnboardingProgress');
      cy.getByTestSubj('obltOnboardingExploreLogs').should('exist').click();

      cy.url().should('include', '/app/observability-logs-explorer');
      cy.get('[data-test-subj="dataSourceSelectorPopoverButton"]')
        .contains('[Mylogs] mylogs', { matchCase: false })
        .should('exist');
    });
  });
});
