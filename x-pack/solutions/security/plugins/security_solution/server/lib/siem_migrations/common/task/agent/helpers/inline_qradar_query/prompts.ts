/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const INLINE_QUERY = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
You are an agent expert in IBM Qradar SIEM platform. Specially in handling Qradar custom rules export in XML Format. Below is some documentation about Qradar custom rules structure and meaning that you must use to perform the required task.

<documentation>
Below is an example of a Qradar custom rule exported in XML format:

  <rule buildingBlock="[true/false]" enabled="[true/false]" id="[rule_id]" ...other attributes...>
    <name>[Rule Name]</name>
    <notes>[Optional description]</notes>

    <testDefinitions>
      <test name="[Internal Test Class Name]" ...attributes...>
        <text>[Human-readable description of the test]</text>
        <parameter id="[param_id]">
          <userSelection>[Selected value, ID, UUID, or query]</userSelection>
          </parameter>
        </test>
      </testDefinitions>

    <actions forceOffenseCreation="[true/false]" ...other attributes.../>

    <responses>
      <newevent name="[New Event Name]" qid="[qid_number]" severity="[value]" .../>
      </responses>
  </rule>

Below is the description of what this XML structur means.
The custom_rule data model represents the logic and actions of a correlation rule or building block within QRadar. Key components include:

- Metadata: Basic information like rule name, ID, status (enabled/disabled), type (Event, Flow, Common, Offense), scope (Local/Global), and owner.
- Test Stack (Conditions): The core "IF" logic, consisting of one or more tests (like checking QIDs, IP addresses, categories, custom properties, matching building blocks, or applying thresholds/sequences). These tests are evaluated sequentially.
- Responses/Actions: The "THEN" part, defining what happens when all tests are met. This includes actions like generating new events, creating/modifying offenses, sending notifications (email, SNMP), updating reference data, or running custom scripts.
- Dependencies: Rules often depend on other QRadar objects, which are typically exported alongside them:
  - Building Blocks: Reusable sets of tests referenced within rules.
  - QID Map Entries (qidmap): Definitions for custom events checked by rules.
  - Custom Properties: User-defined fields extracted from data that rules test against.
  - Reference Data Collections (reference_data): Lists/maps used in rule logic.
  - Log Source Types (sensordevicetype): Device types rules might filter on.

</documentation>





<general_guidelines>
- The original and modified queries must be equivalent, except for the "missing placeholders".
- You must respond with the modified query inside a \`\`\`spl code block, followed by a summary of the replacement steps made in markdown format, starting with "## Inlining Summary".
</general_guidelines>

`,
  ],
  [
    'ai',
    `
Please go through the provided custom rule and prepare a semantic description of its in following format

- Goal
- Test Condition
- Actions
- Data Source
- Dependencies

`,
  ],
]);
