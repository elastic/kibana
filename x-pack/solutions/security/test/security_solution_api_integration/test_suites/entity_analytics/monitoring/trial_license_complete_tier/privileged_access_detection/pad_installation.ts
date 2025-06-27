/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../../utils/data_view';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const uninstallPackage = async () => {
    try {
      await kibanaServer.request({
        method: 'DELETE',
        path: '/api/fleet/epm/packages/pad/0.5.0',
        retries: 1,
      });
    } catch (e) {
      log.info('No existing package found for deletion, continuing');
    }
  };

  const deleteMLJobs = async () => {
    try {
      return await kibanaServer.request({
        method: 'POST',
        path: '/internal/ml/jobs/delete_jobs',
        body: {
          jobIds: [
            'pad_linux_high_count_privileged_process_events_by_user',
            'pad_linux_high_median_process_command_line_entropy_by_user',
            'pad_linux_rare_process_executed_by_user',
            'pad_okta_high_sum_concurrent_sessions_by_user',
            'pad_okta_rare_host_name_by_user',
            'pad_okta_rare_region_name_by_user',
            'pad_okta_rare_source_ip_by_user',
            'pad_okta_spike_in_group_application_assignment_changes',
            'pad_okta_spike_in_group_lifecycle_changes',
            'pad_okta_spike_in_group_membership_changes',
            'pad_okta_spike_in_group_privilege_changes',
            'pad_okta_spike_in_user_lifecycle_management_changes',
            'pad_windows_high_count_group_management_events',
            'pad_windows_high_count_special_logon_events',
            'pad_windows_high_count_special_privilege_use_events',
            'pad_windows_high_count_user_account_management_events',
            'pad_windows_rare_device_by_user',
            'pad_windows_rare_group_name_by_user',
            'pad_windows_rare_privilege_assigned_to_user',
            'pad_windows_rare_region_name_by_user',
            'pad_windows_rare_source_ip_by_user',
          ],
          deleteUserAnnotations: true,
          deleteAlertingRules: false,
        },
        headers: {
          'elastic-api-version': '1',
        },
      });
    } catch (e) {
      log.info('Job deletion unsuccessful, but continuing');
    }
  };

  const simulateMlModuleSetupFromUI = async () => {
    try {
      return await kibanaServer.request({
        method: 'POST',
        path: '/internal/ml/modules/setup/pad-ml',
        body: {
          indexPatternName:
            'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all',
          useDedicatedIndex: false,
          startDatafeed: false,
        },
        headers: {
          'elastic-api-version': '1',
        },
      });
    } catch (e) {
      log.error(e);
      throw Error('Failed to setup ML module');
    }
  };

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    before(async () => {
      await dataView.create('security-solution');
      await uninstallPackage();
      await deleteMLJobs();
    });

    after(async () => {
      await dataView.delete('security-solution');
      await uninstallPackage();
      await deleteMLJobs();
    });

    describe('privileged access detection status and installation APIs', () => {
      it('should be able to successfully install the package', async () => {
        const statusResponseBeforeInstallation =
          await api.getPrivilegedAccessDetectionPackageStatus();

        if (statusResponseBeforeInstallation.status !== 200) {
          log.error(`Retrieving status failed`);
          log.error(JSON.stringify(statusResponseBeforeInstallation.body));
        }

        expect(statusResponseBeforeInstallation.status).eql(200);

        const {
          package_installation_status: packageInstallationStatusBeforeInstallation,
          ml_module_setup_status: mlModuleSetupStatusBeforeInstallation,
        } = statusResponseBeforeInstallation.body;

        expect(packageInstallationStatusBeforeInstallation).eql('incomplete');
        expect(mlModuleSetupStatusBeforeInstallation).eql('incomplete');

        const installationResponse = await api.installPrivilegedAccessDetectionPackage('default');

        expect(installationResponse.status).eql(200);
        expect(installationResponse.body.message).eql(
          'Successfully installed privileged access detection package.'
        );

        const mlModuleSetupResponse = await simulateMlModuleSetupFromUI();
        expect(mlModuleSetupResponse.status).eql(200);

        log.info('Privileged access detection installation was successful');

        const statusResponseAfterInstallation =
          await api.getPrivilegedAccessDetectionPackageStatus();

        if (statusResponseAfterInstallation.status !== 200) {
          log.error(`Retrieving status failed`);
          log.error(JSON.stringify(statusResponseAfterInstallation.body));
        }

        expect(statusResponseAfterInstallation.status).eql(200);

        const {
          package_installation_status: packageInstallationStatusAfterInstallation,
          ml_module_setup_status: mlModuleSetupStatusAfterInstallation,
          jobs: jobsAfterInstallation,
        } = statusResponseAfterInstallation.body;

        expect(packageInstallationStatusAfterInstallation).eql('complete');
        expect(mlModuleSetupStatusAfterInstallation).eql('complete');
        expect(jobsAfterInstallation.length).greaterThan(20);
      });
    });
  });
};
