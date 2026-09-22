/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_URL,
  ALERT_UUID,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';
import { getCompleteRuleMock, getNewTermsRuleParams } from '../../rule_schema/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapSuppressedNewTermsAlerts } from './wrap_suppressed_new_terms_alerts';
import { getSharedParamsMock } from '../__mocks__/shared_params';

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const publicBaseUrl = 'http://somekibanabaseurl.com';

const alertSuppression = {
  groupBy: ['source.ip'],
};

const completeRule = getCompleteRuleMock(getNewTermsRuleParams());
completeRule.ruleParams.alertSuppression = alertSuppression;

const sharedParams = getSharedParamsMock({
  ruleParams: getNewTermsRuleParams({ alertSuppression }),
  rewrites: {
    publicBaseUrl,
    inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  },
});

describe('wrapSuppressedNewTermsAlerts', () => {
  test('should create an alert with the correct _id from a document and suppression fields', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      sharedParams,
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
    });

    expect(alerts[0]._id).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/a36d9fe6fe4b2f65058fb1a487733275f811af58?index=.alerts-security.alerts-default'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toEqual(0);
    expect(alerts[0]._source[ALERT_INSTANCE_ID]).toEqual(
      '1bf77f90e72d76d9335ad0ce356340a3d9833f96'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_TERMS]).toEqual([
      { field: 'source.ip', value: ['127.0.0.1'] },
    ]);
    expect(alerts[0]._source[ALERT_SUPPRESSION_START]).toBeDefined();
    expect(alerts[0]._source[ALERT_SUPPRESSION_END]).toBeDefined();
  });

  test('should create an alert with a different _id if suppression field is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      sharedParams: getSharedParamsMock({
        ruleParams: getNewTermsRuleParams({
          alertSuppression: {
            groupBy: ['someKey'],
          },
        }),
        rewrites: {
          publicBaseUrl,
          inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        },
      }),
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
    });

    expect(alerts[0]._id).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/a36d9fe6fe4b2f65058fb1a487733275f811af58?index=.alerts-security.alerts-default'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_DOCS_COUNT]).toEqual(0);
    expect(alerts[0]._source[ALERT_INSTANCE_ID]).toEqual(
      '01e43acf431fd232bbe230ac523a5d5d1e8a2787'
    );
    expect(alerts[0]._source[ALERT_SUPPRESSION_TERMS]).toEqual([
      { field: 'someKey', value: ['someValue'] },
    ]);
  });

  test('should create an alert with a different _id if the space is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      sharedParams: getSharedParamsMock({
        ruleParams: getNewTermsRuleParams({ alertSuppression }),
        rewrites: {
          publicBaseUrl,
          inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          spaceId: 'other-space',
        },
      }),
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
    });

    expect(alerts[0]._id).toEqual('b8143fa480c96c94688bd70871711fcf5478ee95');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('b8143fa480c96c94688bd70871711fcf5478ee95');
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/other-space/app/security/alerts/redirect/b8143fa480c96c94688bd70871711fcf5478ee95?index=.alerts-security.alerts-other-space'
    );
  });

  test('should create an alert with a different _id if the newTerms array is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapSuppressedNewTermsAlerts({
      sharedParams: getSharedParamsMock({
        ruleParams: getNewTermsRuleParams({ alertSuppression }),
        rewrites: {
          publicBaseUrl,
          inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          spaceId: 'other-space',
        },
      }),
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.2'] }],
    });

    expect(alerts[0]._id).toEqual('9eab1f07709065fa65dd687c2df7a30f4c5f6c9d');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('9eab1f07709065fa65dd687c2df7a30f4c5f6c9d');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.2']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/other-space/app/security/alerts/redirect/9eab1f07709065fa65dd687c2df7a30f4c5f6c9d?index=.alerts-security.alerts-other-space'
    );
  });
});
