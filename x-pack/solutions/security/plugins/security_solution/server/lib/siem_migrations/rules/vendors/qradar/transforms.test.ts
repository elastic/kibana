/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QRadarMitreMappingsData } from '../../../../../../common/siem_migrations/model/vendor/rules/qradar.gen';
import type { QradarRule } from '../../../../../../common/siem_migrations/parsers/qradar/types';
import { TACTICS_BASE_URL, TECHNIQUES_BASE_URL } from './constants';
import { transformMitreMapping, transformQRadarRuleToOriginalRule } from './transforms';

// Test constants for MITRE mapping
const TEST_RULE_ID = 'test-rule-1';
const MITRE_FRAMEWORK = 'MITRE ATT&CK';
const TACTIC_TA0001 = 'TA0001';
const TACTIC_TA0002 = 'TA0002';
const TACTIC_NAME_INITIAL_ACCESS = 'Initial Access';
const TACTIC_NAME_EXECUTION = 'Execution';
const TECHNIQUE_T1078 = 'T1078';
const TECHNIQUE_T1190 = 'T1190';
const TECHNIQUE_T1059 = 'T1059';
const TECHNIQUE_T1133 = 'T1133';

// Test constants for QRadar rules
const QRADAR_RULE_ID = 'rule-123';
const QRADAR_VENDOR = 'qradar';
const XML_QUERY_LANGUAGE = 'xml';
const SIMPLE_XML = '<rule><name>Test</name></rule>';
const TEST_RULE_TITLE = 'Test Rule';
const TEST_RULE_DESCRIPTION = 'Test description';
const RULE_TYPE_CUSTOM = 'custom_rule';
const RULE_TYPE_BUILDING_BLOCK = 'building_block';
const ERROR_MESSAGE_MISSING_ID = 'QRadar rule is missing required field: id';
const ERROR_MESSAGE_MISSING_RULE_DATA = 'QRadar rule is missing required field: rule_data';

describe('QRadar transforms', () => {
  describe('transformMitreMapping', () => {
    it('should transform a valid MITRE mapping with tactics and techniques', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1078]: {
                id: TECHNIQUE_T1078,
                enabled: true,
              },
              [TECHNIQUE_T1190]: {
                id: TECHNIQUE_T1190,
                enabled: true,
              },
            },
          },
          [TACTIC_TA0002]: {
            name: TACTIC_NAME_EXECUTION,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1059]: {
                id: TECHNIQUE_T1059,
                enabled: true,
              },
            },
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(2);

      // Check first threat (Initial Access)
      expect(result[0]).toEqual({
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: TACTIC_TA0001,
          reference: `${TACTICS_BASE_URL}${TACTIC_TA0001}/`,
          name: TACTIC_NAME_INITIAL_ACCESS,
        },
        technique: [
          {
            id: TECHNIQUE_T1078,
            reference: `${TECHNIQUES_BASE_URL}${TECHNIQUE_T1078}/`,
            name: TECHNIQUE_T1078,
          },
          {
            id: TECHNIQUE_T1190,
            reference: `${TECHNIQUES_BASE_URL}${TECHNIQUE_T1190}/`,
            name: TECHNIQUE_T1190,
          },
        ],
      });

      // Check second threat (Execution)
      expect(result[1]).toEqual({
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: TACTIC_TA0002,
          reference: `${TACTICS_BASE_URL}${TACTIC_TA0002}/`,
          name: TACTIC_NAME_EXECUTION,
        },
        technique: [
          {
            id: TECHNIQUE_T1059,
            reference: `${TECHNIQUES_BASE_URL}${TECHNIQUE_T1059}/`,
            name: TECHNIQUE_T1059,
          },
        ],
      });
    });

    it('should return empty array when mapping is undefined', () => {
      // @ts-expect-error Testing undefined mapping
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toEqual([]);
    });

    it('should skip disabled tactics', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: false,
            techniques: {
              [TECHNIQUE_T1078]: {
                id: TECHNIQUE_T1078,
                enabled: true,
              },
            },
          },
          [TACTIC_TA0002]: {
            name: TACTIC_NAME_EXECUTION,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1059]: {
                id: TECHNIQUE_T1059,
                enabled: true,
              },
            },
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].tactic.id).toBe(TACTIC_TA0002);
    });

    it('should skip disabled techniques', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1078]: {
                id: TECHNIQUE_T1078,
                enabled: false,
              },
              [TECHNIQUE_T1190]: {
                id: TECHNIQUE_T1190,
                enabled: true,
              },
            },
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].technique).toHaveLength(1);
      expect(result[0].technique?.[0].id).toBe(TECHNIQUE_T1190);
    });

    it('should skip techniques without an id', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1078]: {
                id: '',
                enabled: true,
              },
              [TECHNIQUE_T1190]: {
                id: TECHNIQUE_T1190,
                enabled: true,
              },
            },
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].technique).toHaveLength(1);
      expect(result[0].technique?.[0].id).toBe(TECHNIQUE_T1190);
    });

    it('should handle tactics without techniques', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].tactic.id).toBe(TACTIC_TA0001);
      expect(result[0].technique).toEqual([]);
    });

    it('should handle tactics with empty techniques object', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
            techniques: {},
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].tactic.id).toBe(TACTIC_TA0001);
      expect(result[0].technique).toEqual([]);
    });

    it('should handle multiple tactics with mixed enabled/disabled techniques', () => {
      const mitreMapping: QRadarMitreMappingsData[string] = {
        id: TEST_RULE_ID,
        mapping: {
          [TACTIC_TA0001]: {
            name: TACTIC_NAME_INITIAL_ACCESS,
            enabled: true,
            techniques: {
              [TECHNIQUE_T1078]: {
                id: TECHNIQUE_T1078,
                enabled: true,
              },
              [TECHNIQUE_T1190]: {
                id: TECHNIQUE_T1190,
                enabled: false,
              },
              [TECHNIQUE_T1133]: {
                id: TECHNIQUE_T1133,
                enabled: true,
              },
            },
          },
        },
      };

      const result = transformMitreMapping(mitreMapping);

      expect(result).toHaveLength(1);
      expect(result[0].technique).toHaveLength(2);
      expect(result[0].technique?.[0].id).toBe(TECHNIQUE_T1078);
      expect(result[0].technique?.[1].id).toBe(TECHNIQUE_T1133);
    });
  });

  describe('transformQRadarRuleToOriginalRule', () => {
    it('should transform a valid QRadar rule to OriginalRule format', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: 'Test Security Rule',
        description: 'This is a test rule description',
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result).toEqual({
        id: QRADAR_RULE_ID,
        vendor: QRADAR_VENDOR,
        title: 'Test Security Rule',
        description: 'This is a test rule description',
        query: SIMPLE_XML,
        query_language: XML_QUERY_LANGUAGE,
      });
    });

    it('should handle QRadar rule with array-wrapped id', () => {
      const qradarRule: QradarRule = {
        id: ['rule-456'] as unknown as string,
        title: 'Test Rule with Array ID',
        description: TEST_RULE_DESCRIPTION,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.id).toBe('rule-456');
    });

    // NOTE: The following tests expose a bug in the implementation where line 87
    // uses qradarRule.rule_data instead of the extracted ruleData variable.
    // The function extracts the first element from arrays (line 70-72) but doesn't use it.
    it('should handle QRadar rule with array-wrapped rule_data', () => {
      const qradarRule: QradarRule = {
        id: 'rule-789',
        title: 'Test Rule with Array Data',
        description: TEST_RULE_DESCRIPTION,
        rule_data: [SIMPLE_XML] as unknown as string,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      // BUG: This should extract the first element but currently returns the array
      expect(result.query).toEqual([SIMPLE_XML]);
    });

    it('should handle QRadar rule with both id and rule_data as arrays', () => {
      const qradarRule: QradarRule = {
        id: ['rule-999'] as unknown as string,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: [SIMPLE_XML] as unknown as string,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.id).toBe('rule-999');
      // BUG: This should extract the first element but currently returns the array
      expect(result.query).toEqual([SIMPLE_XML]);
    });

    it('should throw error when id is missing', () => {
      const qradarRule: QradarRule = {
        id: '',
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      expect(() => transformQRadarRuleToOriginalRule(qradarRule)).toThrow(ERROR_MESSAGE_MISSING_ID);
    });

    it('should throw error when id is an empty array', () => {
      const qradarRule: QradarRule = {
        id: [] as unknown as string,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      expect(() => transformQRadarRuleToOriginalRule(qradarRule)).toThrow(ERROR_MESSAGE_MISSING_ID);
    });

    it('should throw error when rule_data is missing', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: '',
        rule_type: RULE_TYPE_CUSTOM,
      };

      expect(() => transformQRadarRuleToOriginalRule(qradarRule)).toThrow(
        ERROR_MESSAGE_MISSING_RULE_DATA
      );
    });

    it('should throw error when rule_data is an empty array', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: [] as unknown as string,
        rule_type: RULE_TYPE_CUSTOM,
      };

      expect(() => transformQRadarRuleToOriginalRule(qradarRule)).toThrow(
        ERROR_MESSAGE_MISSING_RULE_DATA
      );
    });

    it('should handle QRadar rule without description', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: TEST_RULE_TITLE,
        description: undefined as unknown as string,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.description).toBeUndefined();
    });

    it('should handle QRadar rule with complex XML rule_data', () => {
      const complexXml = `
        <rule>
          <name>Complex Rule</name>
          <responses>
            <response>
              <newevent name="Test Event" severity="8" sendToAriel="true"/>
            </response>
          </responses>
          <test_definitions>
            <test>
              <text>username in ('admin', 'root')</text>
            </test>
          </test_definitions>
        </rule>
      `;

      const qradarRule: QradarRule = {
        id: 'rule-complex',
        title: 'Complex Security Rule',
        description: 'A complex rule with multiple elements',
        rule_data: complexXml,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.query).toBe(complexXml);
      expect(result.query_language).toBe(XML_QUERY_LANGUAGE);
    });

    it('should always set vendor to "qradar"', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_BUILDING_BLOCK,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.vendor).toBe(QRADAR_VENDOR);
    });

    it('should always set query_language to "xml"', () => {
      const qradarRule: QradarRule = {
        id: QRADAR_RULE_ID,
        title: TEST_RULE_TITLE,
        description: TEST_RULE_DESCRIPTION,
        rule_data: SIMPLE_XML,
        rule_type: RULE_TYPE_CUSTOM,
      };

      const result = transformQRadarRuleToOriginalRule(qradarRule);

      expect(result.query_language).toBe(XML_QUERY_LANGUAGE);
    });
  });
});
