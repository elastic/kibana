/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * QRadar rule XML data for testing.
 * Each rule_data contains base64-encoded rule XML.
 */

const QRADAR_RULE_1 = `<rule buildingBlock="false" enabled="true" id="100001">
  <name>QRadar Test Rule - Authentication Success</name>
  <notes>Test rule for detecting successful authentication events</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="21" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following Authentication.Admin Login Success Events</text>
      <parameter id="1">
        <initialText>categories</initialText>
        <selectionLabel>Select a category and click 'Add'</selectionLabel>
        <userSelection>1014, 12-2</userSelection>
      </parameter>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="true" includeAttackerEventsInterval="0" offenseMapping="0"></actions>
  <responses referenceMap="false" referenceMapOfMaps="false">
    <newevent contributeOffenseName="true" credibility="10" describeOffense="true" description="Authentication success detected" forceOffenseCreation="true" lowLevelCategory="20013" name="Auth Success Offense" offenseMapping="0" overrideOffenseName="false" relevance="10"></newevent>
  </responses>
</rule>`;

const QRADAR_RULE_2 = `<rule buildingBlock="true" enabled="true" id="100002">
  <name>QRadar Test Rule - Network Traffic Anomaly</name>
  <notes>Building block rule for detecting network traffic anomalies</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="22" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following Network.Suspicious Activity</text>
      <parameter id="1">
        <initialText>categories</initialText>
        <userSelection>2001, 15-3</userSelection>
      </parameter>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="false"></actions>
</rule>`;

const QRADAR_RULE_3 = `<rule buildingBlock="false" enabled="true" id="100003">
  <name>QRadar Test Rule - Malware Detection</name>
  <notes>Rule for detecting potential malware activity</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="23" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following Malware.Potential Infection</text>
      <parameter id="1">
        <initialText>categories</initialText>
        <userSelection>3001, 18-1</userSelection>
      </parameter>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="true"></actions>
  <responses referenceMap="false">
    <newevent contributeOffenseName="true" credibility="8" describeOffense="true" description="Potential malware detected" forceOffenseCreation="true" lowLevelCategory="30001" name="Malware Alert" relevance="9"></newevent>
  </responses>
</rule>`;

const QRADAR_BUILDING_BLOCK_RULE_2 = `<rule buildingBlock="true" enabled="true" id="100005">
  <name>BB:CategoryDefinition: Privilege Escalation Attempt</name>
  <notes>Building block rule for detecting privilege escalation attempts</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="24" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following Authentication.Privilege Escalation</text>
      <parameter id="1">
        <initialText>categories</initialText>
        <userSelection>4001, 20-1</userSelection>
      </parameter>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="false"></actions>
</rule>`;

const QRADAR_RULE_WITH_REFERENCE_SETS = `<rule buildingBlock="false" enabled="true" id="100004">
  <name>QRadar Test Rule - IP Blocklist Check</name>
  <notes>Rule that checks IPs against reference sets for blocked and suspicious lists</notes>
  <testDefinitions>
    <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest" id="1">
      <text>when the event IP is contained in any of Blocked IPs, Suspicious IPs</text>
    </test>
    <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest" id="2">
      <text>when the event IP is contained in all of Malicious Hosts</text>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="true"></actions>
</rule>`;

// Helper to encode rule XML to base64
const encodeRule = (ruleXml: string): string => {
  return Buffer.from(ruleXml).toString('base64');
};

/**
 * QRadar XML export containing multiple test rules.
 * Used for testing QRadar rule upload in Cypress e2e tests.
 */
export const QRADAR_TEST_RULES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<content>
  <qradarversion>2021.6.12.20250509154206</qradarversion>
  <sensordevice>
    <deviceenabled>true</deviceenabled>
    <devicename>TestDevice @ TestHost</devicename>
    <hostname>TestHost</hostname>
  </sensordevice>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_1)}</rule_data>
  </custom_rule>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_2)}</rule_data>
  </custom_rule>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_3)}</rule_data>
  </custom_rule>
</content>`;

/**
 * QRadar XML with reference sets for testing resource identification.
 */
export const QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS = `<?xml version="1.0" encoding="UTF-8"?>
<content>
  <qradarversion>2021.6.12.20250509154206</qradarversion>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_WITH_REFERENCE_SETS)}</rule_data>
  </custom_rule>
</content>`;

/**
 * Expected reference sets that should be identified from QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS.
 */
export const EXPECTED_QRADAR_REFERENCE_SETS = [
  { type: 'lookup', name: 'Blocked IPs' },
  { type: 'lookup', name: 'Suspicious IPs' },
  { type: 'lookup', name: 'Malicious Hosts' },
];

/**
 * Single QRadar rule XML for simple upload tests.
 */
export const QRADAR_SINGLE_RULE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<content>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_1)}</rule_data>
  </custom_rule>
</content>`;

/**
 * Invalid QRadar XML for error handling tests.
 */
export const QRADAR_INVALID_XML = 'This is not valid XML content';

/**
 * QRadar XML containing only building block rules.
 * Used to test that uploads with only building block rules are rejected.
 */
export const QRADAR_BUILDING_BLOCK_ONLY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<content>
  <qradarversion>2021.6.12.20250509154206</qradarversion>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_RULE_2)}</rule_data>
  </custom_rule>
  <custom_rule>
    <rule_data>${encodeRule(QRADAR_BUILDING_BLOCK_RULE_2)}</rule_data>
  </custom_rule>
</content>`;

/**
 * Empty QRadar XML (no rules) for error handling tests.
 */
export const QRADAR_EMPTY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<content>
  <qradarversion>2021.6.12.20250509154206</qradarversion>
</content>`;
