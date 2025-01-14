/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyAllowlistedFields } from '.';
import { prebuiltRuleAllowlistFields } from './prebuilt_rules_alerts';
import type { AllowlistFields } from './types';

describe('Security Telemetry filters', () => {
  describe('allowlistEventFields', () => {
    const testingKeys: AllowlistFields = {
      _id: true,
      a: true,
      b: true,
      c: {
        d: true,
      },
      'kubernetes.pod.uid': true,
      'kubernetes.pod.name': true,
      'kubernetes.pod.ip': true,
    };

    const allowlist = {
      ...prebuiltRuleAllowlistFields,
      ...testingKeys,
    };

    it('filters top level', () => {
      const event = {
        _id: 'id',
        a: 'a',
        a1: 'a1',
        b: 'b',
        b1: 'b1',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        _id: 'id',
        a: 'a',
        b: 'b',
      });
    });

    it('filters endpoint enrichments', () => {
      const expected = {
        dll: {
          code_signature: {
            trusted: '1',
          },
          Ext: {
            relative_file_creation_time: '2',
            relative_file_name_modify_time: '3',
          },
          hash: {
            sha256: '4',
          },
          name: '5',
          path: '6',
          pe: {
            imphash: '7',
            original_file_name: '8',
          },
        },
        file: {
          directory: '9',
          Ext: {
            entropy: '10',
            header_bytes: '11',
            original: {
              name: '12',
            },
          },
        },
        process: {
          Ext: {
            api: {
              name: '13',
            },
            effective_parent: {
              executable: '14',
              name: '15',
            },
          },
          parent: {
            Ext: {
              real: {
                pid: '16',
              },
            },
          },
        },
      };

      const event = {
        ...expected,
        ...{
          val1: 'unexpected-1',
          val2: 'unexpected-2',
        },
      };

      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual(expected);
    });

    it('filters nested', () => {
      const event = {
        a: {
          a1: 'a1',
        },
        a1: 'a1',
        b: {
          b1: 'b1',
        },
        b1: 'b1',
        c: {
          d: 'd',
          e: 'e',
          f: 'f',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: {
          a1: 'a1',
        },
        b: {
          b1: 'b1',
        },
        c: {
          d: 'd',
        },
      });
    });

    it('filters arrays of objects', () => {
      const event = {
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
            e: 'e1',
            f: 'f1',
          },
          {
            d: 'd2',
            e: 'e2',
            f: 'f2',
          },
          {
            d: 'd3',
            e: 'e3',
            f: 'f3',
          },
        ],
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: [
          {
            a1: 'a1',
          },
        ],
        b: {
          b1: 'b1',
        },
        c: [
          {
            d: 'd1',
          },
          {
            d: 'd2',
          },
          {
            d: 'd3',
          },
        ],
      });
    });

    it("doesn't create empty objects", () => {
      const event = {
        a: 'a',
        b: 'b',
        c: {
          e: 'e',
        },
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        a: 'a',
        b: 'b',
      });
    });

    it("copies long nested strings that shouldn't be broken up on customer deployments", () => {
      const event = {
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
        'kibana.random.long.alert.string': {
          info: 'data',
        },
        'powershell.file.script_block_text': 'h1rY5xI2hC8S#Gv&CB**7hlYV7o',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'kibana.alert.ancestors': 'a',
        'kibana.alert.original_event.module': 'b',
        'powershell.file.script_block_text': 'h1rY5xI2hC8S#Gv&CB**7hlYV7o',
      });
    });

    it('copies alert event fields for cross timeline reference', () => {
      const event = {
        not_event: 'much data, much wow',
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'event.kind': 'signal',
        'event.module': 'aws',
        'event.outcome': 'success',
        'event.provider': 'iam.amazonaws.com',
        'event.type': ['user', 'creation'],
        package_version: '3.4.1',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'event.kind': 'signal',
        'event.module': 'aws',
        'event.outcome': 'success',
        'event.provider': 'iam.amazonaws.com',
        'event.type': ['user', 'creation'],
        package_version: '3.4.1',
      });
    });

    it('copies over kubernetes fields', () => {
      const event = {
        not_event: 'much data, much wow',
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'kubernetes.pod.uid': '059a3767-7492-4fb5-92d4-93f458ddab44',
        'kubernetes.pod.name': 'kube-dns-6f4fd4zzz-7z7xj',
        'kubernetes.pod.ip': '10-245-0-5',
      };
      expect(copyAllowlistedFields(allowlist, event)).toStrictEqual({
        'event.id': '36857486973080746231799376445175633955031786243637182487',
        'event.ingested': 'May 17, 2022 @ 00:22:07.000',
        'kubernetes.pod.uid': '059a3767-7492-4fb5-92d4-93f458ddab44',
        'kubernetes.pod.name': 'kube-dns-6f4fd4zzz-7z7xj',
        'kubernetes.pod.ip': '10-245-0-5',
      });
    });

    it('copies over threat indicator fields', () => {
      const event = {
        not_event: 'much data, much wow',
        threat: {
          feed: {
            name: 'test_feed',
            reference: 'test',
            description: 'this is a test description',
            dashboard_id: '69c33c01-f856-42c6-b23f-4a6e1c98fe82',
          },
        },
      };
      expect(copyAllowlistedFields(prebuiltRuleAllowlistFields, event)).toStrictEqual({
        threat: {
          feed: {
            name: 'test_feed',
            reference: 'test',
            description: 'this is a test description',
          },
        },
      });
    });

    it('copies over github integration fields', () => {
      const event = {
        not_event: 'much data, much wow',
        github: {
          org: 'elastic',
          repo: 'kibana',
          team: 'elastic/security-data-analytics',
          sensitive: 'i contain sensitive data',
        },
      };
      expect(copyAllowlistedFields(prebuiltRuleAllowlistFields, event)).toStrictEqual({
        github: {
          org: 'elastic',
          repo: 'kibana',
          team: 'elastic/security-data-analytics',
        },
      });
    });

    it('copies over process/parent fields', () => {
      const event = {
        not_event: 'much data, much wow',
        process: {
          code_signature: {
            status: 'test',
            exists: false,
          },
          Ext: {
            api: {
              parameters: {
                desired_access: 'test',
                desired_access_numeric: 'test',
                text_block: 'i should not be here',
              },
            },
            relative_file_creation_time: 'test',
          },
          parent: {
            code_signature: {
              subject_name: 'test',
              status: 'test',
              text_block: 'i should not be here',
              exists: false,
              trusted: false,
            },
          },
        },
      };
      expect(copyAllowlistedFields(prebuiltRuleAllowlistFields, event)).toStrictEqual({
        process: {
          code_signature: {
            status: 'test',
            exists: false,
          },
          Ext: {
            api: {
              parameters: {
                desired_access: 'test',
                desired_access_numeric: 'test',
              },
            },
            relative_file_creation_time: 'test',
          },
          parent: {
            code_signature: {
              subject_name: 'test',
              status: 'test',
              exists: false,
              trusted: false,
            },
          },
        },
      });
    });
  });
});
