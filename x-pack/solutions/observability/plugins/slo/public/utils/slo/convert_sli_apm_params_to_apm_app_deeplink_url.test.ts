/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSliApmParamsToApmAppDeeplinkUrl } from './convert_sli_apm_params_to_apm_app_deeplink_url';
import { buildSlo } from '../../data/slo/slo';
import { buildApmLatencyIndicator } from '../../data/slo/indicator';
import { ALL_VALUE } from '@kbn/slo-schema';

const DEFAULT_PARAMS = {
  environment: 'fooEnvironment',
  filter: 'agent.name : "beats" and agent.version : 3.4.12 ',
  service: 'barService',
  transactionName: 'bazName',
  transactionType: 'blarfType',
};

describe('convertSliApmParamsToApmAppDeeplinkUrl', () => {
  it('should return a correct APM deeplink when all params have a value', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator(DEFAULT_PARAMS),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when all environment is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, environment: ALL_VALUE }),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when empty filter is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, filter: '' }),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22"`
    );
  });

  it('should return an empty string if all service is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, service: ALL_VALUE }),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/*/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when all transactionName is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, transactionName: ALL_VALUE }),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when all transactionType is passed', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, transactionType: ALL_VALUE }),
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when instanceId is provided and groupings is non-empty', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator(DEFAULT_PARAMS),
        instanceId: 'bf6689b383749812f35c7a408f57d113',
        groupings: {
          'label.project_id': 'bf6689b383749812f35c7a408f57d113',
        },
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/barService/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12++and+label.project_id+%3A+%22bf6689b383749812f35c7a408f57d113%22"`
    );
  });

  it('should return a correct APM deeplink when groupings has only service.name', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, service: ALL_VALUE }),
        instanceId: 'cart-service',
        groupings: {
          'service.name': 'cart-service',
        },
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/cart-service/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });

  it('should return a correct APM deeplink when groupings has multiple fields including service.name', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, service: ALL_VALUE }),
        instanceId: 'cart-service,project-123',
        groupings: {
          'service.name': 'cart-service',
          'label.project_id': 'project-123',
        },
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/cart-service/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12++and+label.project_id+%3A+%22project-123%22"`
    );
  });

  it('should return a correct APM deeplink when instanceId is "*" and groupings is empty', () => {
    const url = convertSliApmParamsToApmAppDeeplinkUrl(
      buildSlo({
        indicator: buildApmLatencyIndicator({ ...DEFAULT_PARAMS, service: ALL_VALUE }),
        instanceId: '*',
      })
    );

    expect(url).toMatchInlineSnapshot(
      `"/app/apm/services/*/overview?comparisonEnabled=true&environment=fooEnvironment&transactionType=blarfType&rangeFrom=now-30d&rangeTo=now&kuery=transaction.name+%3A+%22bazName%22+and+agent.name+%3A+%22beats%22+and+agent.version+%3A+3.4.12+"`
    );
  });
});
