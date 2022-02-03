/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('Machine Learning', function () {
    this.tags(['mlqa']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization_small');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_apache');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_auditbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_apm_transaction');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_heartbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_nginx');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_security_endpoint');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_auditbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_packetbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_winlogbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_metricbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_cloudtrail');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_metrics_ui');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_apache_data_stream');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_nginx_data_stream');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./anomaly_detectors'));
    loadTestFile(require.resolve('./calendars'));
    loadTestFile(require.resolve('./datafeeds'));
    loadTestFile(require.resolve('./data_frame_analytics'));
    loadTestFile(require.resolve('./fields_service'));
    loadTestFile(require.resolve('./filters'));
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./job_validation'));
    loadTestFile(require.resolve('./job_audit_messages'));
    loadTestFile(require.resolve('./jobs'));
    loadTestFile(require.resolve('./modules'));
    loadTestFile(require.resolve('./results'));
    loadTestFile(require.resolve('./saved_objects'));
    loadTestFile(require.resolve('./system'));
    loadTestFile(require.resolve('./trained_models'));
  });
}
