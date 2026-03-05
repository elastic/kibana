/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import type { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getThreatMatchRuleForAlertTesting, previewRule } from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

const INPUT_INDEX_WARNING = 'Unable to find matching indices for rule';
const THREAT_INDEX_WARNING = 'Unable to find matching threat indicator indices for rule';

const warningsContain = (warnings: string[], substring: string): boolean =>
  warnings.some((w) => w.includes(substring));

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatHostsPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless @serverlessQA Indicator match rule validations', () => {
    before(async () => {
      await esArchiver.load(auditbeatHostsPath);
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    after(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await esArchiver.unload(auditbeatHostsPath);
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    describe('index validations', () => {
      it('results in partial failure when input index pattern does not match any indices', async () => {
        const rule: ThreatMatchRuleCreateProps = {
          ...getThreatMatchRuleForAlertTesting(['auditbeat-*'], 'im-no-input-index', true),
          index: ['does-not-exist-*'],
          threat_index: ['auditbeat-*'],
          enabled: true,
        };

        const { logs } = await previewRule({ supertest, rule });

        expect(logs).toHaveLength(1);
        expect(warningsContain(logs[0].warnings, INPUT_INDEX_WARNING)).toBe(true);
        expect(warningsContain(logs[0].warnings, THREAT_INDEX_WARNING)).toBe(false);
      });

      it('results in partial failure when threat index pattern does not match any indices', async () => {
        const rule: ThreatMatchRuleCreateProps = {
          ...getThreatMatchRuleForAlertTesting(['auditbeat-*'], 'im-no-threat-index', true),
          threat_index: ['does-not-exist-threat-*'],
          enabled: true,
        };

        const { logs } = await previewRule({ supertest, rule });

        expect(logs).toHaveLength(1);
        expect(warningsContain(logs[0].warnings, THREAT_INDEX_WARNING)).toBe(true);
        expect(warningsContain(logs[0].warnings, INPUT_INDEX_WARNING)).toBe(false);
      });

      it('results in partial failure when both index and threat index patterns do not match any indices', async () => {
        const rule: ThreatMatchRuleCreateProps = {
          ...getThreatMatchRuleForAlertTesting(
            ['auditbeat-*'],
            'im-no-index-no-threat-index',
            true
          ),
          index: ['does-not-exist-*'],
          threat_index: ['does-not-exist-threat-*'],
          enabled: true,
        };

        const { logs } = await previewRule({ supertest, rule });

        expect(logs).toHaveLength(1);
        expect(warningsContain(logs[0].warnings, INPUT_INDEX_WARNING)).toBe(true);
        expect(warningsContain(logs[0].warnings, THREAT_INDEX_WARNING)).toBe(true);
      });
    });
  });
};
