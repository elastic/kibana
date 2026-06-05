/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_URL, ALERT_UUID } from '@kbn/rule-data-utils';
import { ALERT_NEW_TERMS } from '../../../../../common/field_maps/field_names';
import { getNewTermsRuleParams } from '../../rule_schema/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import { getSharedParamsMock } from '../__mocks__/shared_params';

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';
const publicBaseUrl = 'http://somekibanabaseurl.com';
const sharedParams = getSharedParamsMock({
  ruleParams: getNewTermsRuleParams(),
  rewrites: {
    publicBaseUrl,
    inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  },
});
describe('wrapNewTermsAlerts', () => {
  test('should create an alert with the correct _id from a document', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapNewTermsAlerts({
      sharedParams,
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
    });

    expect(alerts[0]._id).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('a36d9fe6fe4b2f65058fb1a487733275f811af58');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/app/security/alerts/redirect/a36d9fe6fe4b2f65058fb1a487733275f811af58?index=.alerts-security.alerts-default'
    );
  });

  test('should create an alert with a different _id if the space is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const newSharedParams = getSharedParamsMock({
      ruleParams: getNewTermsRuleParams(),
      rewrites: {
        publicBaseUrl,
        inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        spaceId: 'other-space',
      },
    });
    const alerts = wrapNewTermsAlerts({
      sharedParams: newSharedParams,
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1'] }],
    });

    expect(alerts[0]._id).toEqual('b8143fa480c96c94688bd70871711fcf5478ee95');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('b8143fa480c96c94688bd70871711fcf5478ee95');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/other-space/app/security/alerts/redirect/b8143fa480c96c94688bd70871711fcf5478ee95?index=.alerts-security.alerts-other-space'
    );
  });

  test('should create an alert with a different _id if the newTerms array is different', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const newSharedParams = getSharedParamsMock({
      ruleParams: getNewTermsRuleParams(),
      rewrites: {
        publicBaseUrl,
        inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        spaceId: 'other-space',
      },
    });
    const alerts = wrapNewTermsAlerts({
      sharedParams: newSharedParams,
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.2'] }],
    });

    expect(alerts[0]._id).toEqual('9eab1f07709065fa65dd687c2df7a30f4c5f6c9d');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('9eab1f07709065fa65dd687c2df7a30f4c5f6c9d');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.2']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/other-space/app/security/alerts/redirect/9eab1f07709065fa65dd687c2df7a30f4c5f6c9d?index=.alerts-security.alerts-other-space'
    );
  });

  test('should create an alert with a different _id if the newTerms array contains multiple terms', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const newSharedParams = getSharedParamsMock({
      ruleParams: getNewTermsRuleParams(),
      rewrites: {
        publicBaseUrl,
        inputIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        spaceId: 'other-space',
      },
    });
    const alerts = wrapNewTermsAlerts({
      sharedParams: newSharedParams,
      eventsAndTerms: [{ event: doc, newTerms: ['127.0.0.1', '127.0.0.2'] }],
    });

    expect(alerts[0]._id).toEqual('7d3dfa1c3f6d5dbf5e7a1b069a9707adbdb48948');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('7d3dfa1c3f6d5dbf5e7a1b069a9707adbdb48948');
    expect(alerts[0]._source[ALERT_NEW_TERMS]).toEqual(['127.0.0.1', '127.0.0.2']);
    expect(alerts[0]._source[ALERT_URL]).toContain(
      'http://somekibanabaseurl.com/s/other-space/app/security/alerts/redirect/7d3dfa1c3f6d5dbf5e7a1b069a9707adbdb48948?index=.alerts-security.alerts-other-space'
    );
  });
});
