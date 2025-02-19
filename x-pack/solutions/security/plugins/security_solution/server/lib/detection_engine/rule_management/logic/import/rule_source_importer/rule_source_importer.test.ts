/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleToImport,
  ValidatedRuleToImport,
} from '../../../../../../../common/api/detection_engine';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from '../../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { createMockConfig, requestContextMock } from '../../../../routes/__mocks__';
import { getPrebuiltRuleMock } from '../../../../prebuilt_rules/mocks';
import { createRuleSourceImporter } from './rule_source_importer';
import * as calculateRuleSourceModule from '../calculate_rule_source_for_import';

describe('ruleSourceImporter', () => {
  let ruleAssetsClientMock: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;
  let config: ReturnType<typeof createMockConfig>;
  let context: ReturnType<typeof requestContextMock.create>['securitySolution'];
  let ruleToImport: RuleToImport;
  let subject: ReturnType<typeof createRuleSourceImporter>;

  beforeEach(() => {
    jest.clearAllMocks();
    config = createMockConfig();
    context = requestContextMock.create().securitySolution;
    ruleAssetsClientMock = createPrebuiltRuleAssetsClientMock();
    ruleAssetsClientMock.fetchLatestAssets.mockResolvedValue([{}]);
    ruleAssetsClientMock.fetchLatestVersions.mockResolvedValue([]);
    ruleAssetsClientMock.fetchAssetsByVersion.mockResolvedValue([]);
    ruleToImport = { rule_id: 'rule-1', version: 1 } as RuleToImport;

    subject = createRuleSourceImporter({
      context,
      config,
      prebuiltRuleAssetsClient: ruleAssetsClientMock,
      ruleCustomizationStatus: { isRulesCustomizationEnabled: true },
    });
  });

  it('should initialize correctly', () => {
    expect(subject).toBeDefined();

    expect(() => subject.isPrebuiltRule(ruleToImport)).toThrowErrorMatchingInlineSnapshot(
      `"Rule rule-1 was not registered during setup."`
    );
  });

  describe('#setup()', () => {
    it('fetches the rules package on the initial call', async () => {
      await subject.setup([]);

      expect(ruleAssetsClientMock.fetchLatestAssets).toHaveBeenCalledTimes(1);
    });

    it('does not fetch the rules package on subsequent calls', async () => {
      await subject.setup([]);
      await subject.setup([]);
      await subject.setup([]);

      expect(ruleAssetsClientMock.fetchLatestAssets).toHaveBeenCalledTimes(1);
    });

    it('throws an error if the ruleAsstClient does', async () => {
      ruleAssetsClientMock.fetchLatestAssets.mockReset().mockRejectedValue(new Error('failed'));

      await expect(() => subject.setup([])).rejects.toThrowErrorMatchingInlineSnapshot(`"failed"`);
    });
  });

  describe('#isPrebuiltRule()', () => {
    beforeEach(() => {
      ruleAssetsClientMock.fetchLatestVersions.mockResolvedValue([ruleToImport]);
    });

    it("returns false if the rule's rule_id doesn't match an available rule asset", async () => {
      ruleAssetsClientMock.fetchLatestVersions.mockReset().mockResolvedValue([]);
      await subject.setup([ruleToImport]);

      expect(subject.isPrebuiltRule(ruleToImport)).toBe(false);
    });

    it("returns true if the rule's rule_id matches an available rule asset", async () => {
      await subject.setup([ruleToImport]);

      expect(subject.isPrebuiltRule(ruleToImport)).toBe(true);
    });

    it('returns true if the rule has no version, but its rule_id matches an available rule asset', async () => {
      const ruleWithoutVersion = { ...ruleToImport, version: undefined };
      await subject.setup([ruleWithoutVersion]);

      expect(subject.isPrebuiltRule(ruleWithoutVersion)).toBe(true);
    });

    it('throws an error if the rule is not known to the calculator', async () => {
      await subject.setup([ruleToImport]);

      expect(() =>
        subject.isPrebuiltRule({ rule_id: 'other-rule' } as RuleToImport)
      ).toThrowErrorMatchingInlineSnapshot(`"Rule other-rule was not registered during setup."`);
    });

    it('throws an error if the calculator is not set up', () => {
      expect(() => subject.isPrebuiltRule(ruleToImport)).toThrowErrorMatchingInlineSnapshot(
        `"Rule rule-1 was not registered during setup."`
      );
    });
  });

  describe('#calculateRuleSource()', () => {
    let rule: ValidatedRuleToImport;
    let calculatorSpy: jest.SpyInstance;

    beforeEach(() => {
      rule = { rule_id: 'validated-rule', version: 1 } as ValidatedRuleToImport;
      ruleAssetsClientMock.fetchAssetsByVersion.mockResolvedValue([
        getPrebuiltRuleMock({ rule_id: 'rule-1' }),
      ]);
      ruleAssetsClientMock.fetchLatestVersions.mockResolvedValue([
        getPrebuiltRuleMock({ rule_id: 'rule-1' }),
        getPrebuiltRuleMock({ rule_id: 'rule-2' }),
        getPrebuiltRuleMock({ rule_id: 'validated-rule' }),
      ]);
      calculatorSpy = jest
        .spyOn(calculateRuleSourceModule, 'calculateRuleSourceForImport')
        .mockReturnValue({ ruleSource: { type: 'internal' }, immutable: false });
    });

    it('invokes calculateRuleSourceForImport with the correct arguments', async () => {
      await subject.setup([rule]);
      await subject.calculateRuleSource(rule);

      expect(calculatorSpy).toHaveBeenCalledTimes(1);
      expect(calculatorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rule,
          prebuiltRuleAssetsByRuleId: { 'rule-1': expect.objectContaining({ rule_id: 'rule-1' }) },
          isKnownPrebuiltRule: true,
        })
      );
    });

    it('throws an error if the rule is not known to the calculator', async () => {
      ruleAssetsClientMock.fetchLatestVersions.mockResolvedValue([ruleToImport]);
      await subject.setup([ruleToImport]);

      expect(() => subject.calculateRuleSource(rule)).toThrowErrorMatchingInlineSnapshot(
        `"Rule validated-rule was not registered during setup."`
      );
    });

    it('throws an error if the calculator is not set up', async () => {
      expect(() => subject.calculateRuleSource(rule)).toThrowErrorMatchingInlineSnapshot(
        `"Rule validated-rule was not registered during setup."`
      );
    });

    describe('for rules set up without a version', () => {
      it('invokes the calculator with the correct arguments', async () => {
        await subject.setup([{ ...rule, version: undefined }]);
        await subject.calculateRuleSource(rule);

        expect(calculatorSpy).toHaveBeenCalledTimes(1);
        expect(calculatorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            rule,
            prebuiltRuleAssetsByRuleId: {
              'rule-1': expect.objectContaining({ rule_id: 'rule-1' }),
            },
            isKnownPrebuiltRule: true,
          })
        );
      });
    });
  });
});
