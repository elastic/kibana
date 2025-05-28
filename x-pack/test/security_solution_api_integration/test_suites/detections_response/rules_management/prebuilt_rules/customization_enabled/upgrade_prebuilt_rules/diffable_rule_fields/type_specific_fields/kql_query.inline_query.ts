/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KqlQueryType,
  ThreeWayDiffOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

const RULE_TYPES = ['query', 'threat_match', 'threshold', 'new_terms'] as const;

export function inlineQueryKqlQueryField({ getService }: FtrProviderContext): void {
  for (const ruleType of RULE_TYPES) {
    describe(`"kql_query" with inline query for ${ruleType} rule`, () => {
      describe('non-customized without an upgrade (AAA diff case)', () => {
        describe('without filters', () => {
          const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
            installed: {
              type: ruleType,
              query: 'process.name:*.exe',
              language: 'kuery',
            },
            patch: {},
            upgrade: {
              type: ruleType,
              query: 'process.name:*.exe',
              language: 'kuery',
            },
          };

          testFieldUpgradeReview(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
            },
            getService
          );

          testFieldUpgradesToResolvedValue(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              resolvedValue: {
                type: KqlQueryType.inline_query,
                query: 'resolved:*',
                language: 'kuery',
                filters: [],
              },
              expectedFieldsAfterUpgrade: {
                type: ruleType,
                query: 'resolved:*',
                language: 'kuery',
              },
            },
            getService
          );
        });

        describe('with filters', () => {
          describe('and filters have "alias" field set to null for installed rules', () => {
            const FILTER = {
              meta: {
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'test',
                params: {
                  query: 'value',
                },
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            };

            const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
              installed: {
                type: ruleType,
                filters: [FILTER],
                ...(ruleType === 'threshold'
                  ? {
                      threshold: {
                        value: 10,
                        field: 'fieldA',
                      },
                    }
                  : {}),
              },
              patch: {
                type: ruleType,
                filters: [
                  {
                    ...FILTER,
                    meta: {
                      ...FILTER.meta,
                      alias: null,
                    },
                  },
                ],
                ...(ruleType === 'threshold'
                  ? {
                      threshold: {
                        value: 10,
                        field: 'fieldA',
                      },
                    }
                  : {}),
              },
              upgrade: {
                type: ruleType,
                filters: [FILTER],
                ...(ruleType === 'threshold'
                  ? {
                      threshold: {
                        value: 10,
                        field: 'fieldA',
                      },
                    }
                  : {}),
              },
            };

            testFieldUpgradeReview(
              {
                ruleUpgradeAssets,
                diffableRuleFieldName: 'kql_query',
                expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
              },
              getService
            );
          });
        });
      });

      describe('non-customized with an upgrade (AAB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: ruleType,
            query: 'process.name:*.exe',
            language: 'kuery',
          },
          patch: {},
          upgrade: {
            type: ruleType,
            query: 'process.name:*.sys',
            language: 'kuery',
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            expectedFieldDiffValues: {
              base: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              current: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              target: {
                query: 'process.name:*.sys',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              merged: {
                query: 'process.name:*.sys',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedFieldsAfterUpgrade: {
              type: ruleType,
              query: 'process.name:*.sys',
              language: 'kuery',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              type: ruleType,
              query: 'resolved:*',
              language: 'kuery',
            },
          },
          getService
        );
      });

      describe('customized without an upgrade (ABA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: ruleType,
            query: 'process.name:*.exe',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          patch: {
            type: ruleType,
            query: '*:*',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          upgrade: {
            type: ruleType,
            query: 'process.name:*.exe',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            expectedFieldDiffValues: {
              base: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              current: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              target: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              merged: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedFieldsAfterUpgrade: { type: ruleType, query: '*:*', language: 'kuery' },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              type: ruleType,
              query: 'resolved:*',
              language: 'kuery',
            },
          },
          getService
        );
      });

      describe('customized with the matching upgrade (ABB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: ruleType,
            query: 'process.name:*.exe',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          patch: {
            type: ruleType,
            query: '*:*',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          upgrade: {
            type: ruleType,
            query: '*:*',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
            expectedFieldDiffValues: {
              base: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              current: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              target: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              merged: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedFieldsAfterUpgrade: { type: ruleType, query: '*:*', language: 'kuery' },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              type: ruleType,
              query: 'resolved:*',
              language: 'kuery',
            },
          },
          getService
        );
      });

      describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: ruleType,
            query: 'process.name:*.exe',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          patch: {
            type: ruleType,
            query: '*:*',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
          upgrade: {
            type: ruleType,
            query: 'process.name:*.sys',
            language: 'kuery',
            ...(ruleType === 'threshold'
              ? {
                  threshold: {
                    value: 10,
                    field: 'fieldA',
                  },
                }
              : {}),
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            isSolvableConflict: false,
            expectedFieldDiffValues: {
              base: {
                query: 'process.name:*.exe',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              current: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              target: {
                query: 'process.name:*.sys',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
              merged: {
                query: '*:*',
                language: 'kuery',
                type: KqlQueryType.inline_query,
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: {
              type: ruleType,
              query: 'resolved:*',
              language: 'kuery',
            },
          },
          getService
        );
      });

      describe('without historical versions', () => {
        describe('customized with the matching upgrade (-AA diff case)', () => {
          const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
            installed: {
              type: ruleType,
              query: 'process.name:*.exe',
              language: 'kuery',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            patch: {
              type: ruleType,
              query: 'process.name:*.sys',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            upgrade: {
              type: ruleType,
              query: 'process.name:*.sys',
              language: 'kuery',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            removeInstalledAssets: true,
          };

          testFieldUpgradeReview(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
            },
            getService
          );

          testFieldUpgradesToResolvedValue(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              resolvedValue: {
                type: KqlQueryType.inline_query,
                query: 'resolved:*',
                language: 'kuery',
                filters: [],
              },
              expectedFieldsAfterUpgrade: {
                type: ruleType,
                query: 'resolved:*',
                language: 'kuery',
              },
            },
            getService
          );
        });

        describe('customized with an upgrade (-AB diff case)', () => {
          const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
            installed: {
              type: ruleType,
              query: 'process.name:*.exe',
              language: 'kuery',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            patch: {
              type: ruleType,
              query: '*:*',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            upgrade: {
              type: ruleType,
              query: 'process.name:*.sys',
              language: 'kuery',
              ...(ruleType === 'threshold'
                ? {
                    threshold: {
                      value: 10,
                      field: 'fieldA',
                    },
                  }
                : {}),
            },
            removeInstalledAssets: true,
          };

          testFieldUpgradeReview(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              expectedFieldDiffValues: {
                current: {
                  query: '*:*',
                  language: 'kuery',
                  type: KqlQueryType.inline_query,
                  filters: [],
                },
                target: {
                  query: 'process.name:*.sys',
                  language: 'kuery',
                  type: KqlQueryType.inline_query,
                  filters: [],
                },
                merged: {
                  query: 'process.name:*.sys',
                  language: 'kuery',
                  type: KqlQueryType.inline_query,
                  filters: [],
                },
              },
            },
            getService
          );

          testFieldUpgradesToResolvedValue(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'kql_query',
              resolvedValue: {
                type: KqlQueryType.inline_query,
                query: 'resolved:*',
                language: 'kuery',
                filters: [],
              },
              expectedFieldsAfterUpgrade: {
                type: ruleType,
                query: 'resolved:*',
                language: 'kuery',
              },
            },
            getService
          );
        });
      });
    });
  }
}
