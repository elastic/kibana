/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { createNewTermsAlertType } from './create_new_terms_alert_type';
import { executeNewTermsEsqlApproach } from './execute_new_terms_esql_approach';
import { executeNewTermsAggregationApproach } from './execute_new_terms_aggregation_approach';

jest.mock('./execute_new_terms_esql_approach', () => ({
  executeNewTermsEsqlApproach: jest.fn().mockResolvedValue({ test: 'esql' }),
}));

jest.mock('./execute_new_terms_aggregation_approach', () => ({
  executeNewTermsAggregationApproach: jest.fn().mockResolvedValue({ test: 'aggregation' }),
}));

const esqlMock = executeNewTermsEsqlApproach as jest.MockedFunction<
  typeof executeNewTermsEsqlApproach
>;
const aggregationMock = executeNewTermsAggregationApproach as jest.MockedFunction<
  typeof executeNewTermsAggregationApproach
>;

const createLicensingMock = (hasAtLeastFn: ILicense['hasAtLeast']): LicensingPluginSetup =>
  ({
    license$: of({ hasAtLeast: hasAtLeastFn } as unknown as ILicense),
  } as unknown as LicensingPluginSetup);

const createExecOptions = ({
  inputIndex,
  experimentalFeatures,
  licensing,
}: {
  inputIndex: string[];
  experimentalFeatures: ExperimentalFeatures;
  licensing: LicensingPluginSetup;
}) =>
  ({
    sharedParams: {
      inputIndex,
      experimentalFeatures,
      licensing,
    },
  } as unknown as Parameters<ReturnType<typeof createNewTermsAlertType>['executor']>[0]);

describe('createNewTermsAlertType executor approach selection', () => {
  const ruleType = createNewTermsAlertType();

  beforeEach(() => {
    esqlMock.mockClear();
    aggregationMock.mockClear();
  });

  describe('when newTermsEsqlApproachEnabled is true (default)', () => {
    const features: ExperimentalFeatures = {
      ...allowedExperimentalValues,
      newTermsEsqlApproachEnabled: true,
    };

    it('uses ES|QL approach for local-only indices on any license', async () => {
      const licensing = createLicensingMock(() => false);
      const execOptions = createExecOptions({
        inputIndex: ['logs-*', 'auditbeat-*'],
        experimentalFeatures: features,
        licensing,
      });

      await ruleType.executor(execOptions);

      expect(esqlMock).toHaveBeenCalledWith(execOptions);
      expect(aggregationMock).not.toHaveBeenCalled();
    });

    it('uses ES|QL approach for cross-cluster indices with enterprise license', async () => {
      const licensing = createLicensingMock((level: LicenseType) => level === 'enterprise');
      const execOptions = createExecOptions({
        inputIndex: ['logs-*', 'remote:logs-*'],
        experimentalFeatures: features,
        licensing,
      });

      await ruleType.executor(execOptions);

      expect(esqlMock).toHaveBeenCalledWith(execOptions);
      expect(aggregationMock).not.toHaveBeenCalled();
    });

    it('falls back to aggregation for cross-cluster indices without enterprise license', async () => {
      const licensing = createLicensingMock(() => false);
      const execOptions = createExecOptions({
        inputIndex: ['logs-*', 'remote:logs-*'],
        experimentalFeatures: features,
        licensing,
      });

      await ruleType.executor(execOptions);

      expect(aggregationMock).toHaveBeenCalledWith(execOptions);
      expect(esqlMock).not.toHaveBeenCalled();
    });
  });

  describe('when newTermsEsqlApproachEnabled is false', () => {
    const features: ExperimentalFeatures = {
      ...allowedExperimentalValues,
      newTermsEsqlApproachEnabled: false,
    };

    it('always uses aggregation approach for local indices', async () => {
      const licensing = createLicensingMock(() => true);
      const execOptions = createExecOptions({
        inputIndex: ['logs-*'],
        experimentalFeatures: features,
        licensing,
      });

      await ruleType.executor(execOptions);

      expect(aggregationMock).toHaveBeenCalledWith(execOptions);
      expect(esqlMock).not.toHaveBeenCalled();
    });

    it('always uses aggregation approach for cross-cluster indices even with enterprise license', async () => {
      const licensing = createLicensingMock(() => true);
      const execOptions = createExecOptions({
        inputIndex: ['logs-*', 'remote:logs-*'],
        experimentalFeatures: features,
        licensing,
      });

      await ruleType.executor(execOptions);

      expect(aggregationMock).toHaveBeenCalledWith(execOptions);
      expect(esqlMock).not.toHaveBeenCalled();
    });
  });
});
