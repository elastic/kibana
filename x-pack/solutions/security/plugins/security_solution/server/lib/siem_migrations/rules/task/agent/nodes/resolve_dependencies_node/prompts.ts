/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const QRADAR_DEPENDENCIES_RESOLVE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
You are an agent expert in IBM Qradar SIEM platform. Specially in handling Qradar custom rules export in XML Format. First go through the documentation and then we will talk about objective and example response.

<documentation>
Below is an example of a Qradar custom rule exported in XML format:

  <rule buildingBlock="[true/false]" enabled="[true/false]" id="[rule_id]" group="[group_id]" ...other attributes...>
    <name>[Rule Name]</name>
    <notes>[Optional description]</notes>

    <testDefinitions>
      <test name="[Internal Test Class Name]" negate="[true/false]" id="[test_id]" ...other attributes...>
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


Dependencies can be found in multiple ways. We list down certain guidelines to correctly identify dependencies.

## Rules Dependencies Guidelines
- Rule Names in Tests: If you a test with name such as 'RuleMatch_Test' or 'getCommonRules', it indicates a dependency on another rule. List of rule names can be found within that test condition.
- If a test condition references another rule by name, that indicates a dependency on that rule. A dependency can also have other rules as its dependencies.
- A Test can indicate both Rule ID in form of (OWNER-RULE_ID) and Rule Name. Use Rule Name to identify dependencies.
- Building Block Rules: If a rule as a dependency on another rules with name starting with "BB:", it indicates a building block rule dependency.
- If, in a test condition, there is a reference to certain constant numbers or values. Those should included as well. For example, SSH has port 22, RDP has port 3389, etc. These are important details.
- Below is the psuedo logic to identify RULE dependencies tree from test conditions:
  1. START
  2. Read through main rule's test conditions.
  3. For each test condition:
    - If it references another rule by name, add that rule to dependencies.
    - If it contains constant values (like port numbers, protocol names, etc.), note those as important details.
  4. For each newly found dependency rule in this iteration, recursively repeat steps 2-4 to find further dependencies.
  5. STOP when no new dependencies are found.
  6. OUTPUT should look like:
    - Main Rule Title
    - Main Rule Description
    - Data sources for main rules and rules found in dependencies
    - Precise Test Conditions of Main Rules and dependencies (flattened)
    - List of all Resolved Dependencies with their Titles, Descriptions


</documentation>


<objective>

Your primary objective is to create a natural language description of the rule by going through all of its dependencies.  The response should follow the <example_response> format below.

</objective>



<example_response>

  #### Title
  Name of the main Rule

  #### Description
  This search looks for processes launching netsh.exe to execute various commands via the netsh command-line utility. Netsh.exe is a command-line scripting utility that allows you to, either locally or remotely, display or modify the network configuration of a computer that is currently running. Netsh can be used as a persistence proxy technique to execute a helper .dll when netsh.exe is executed. In this search, we are looking for processes spawned by netsh.exe that are executing commands via the command line. Deprecated because we have another detection of the same type.

  #### Data Sources
  Zscaler

  ### Test Conditions:
  - Test Condition [test_id] [group_id] ( Human-readable description of the test condition 1 )
  - Test Condition [test_id] [group_id] ( Human-readable description of the test condition 2 )

 #### Resolved Dependencies Tree: Once all the dependencies have been returned by tool calls, Flatten the list of all dependencies and present them as below. a human readable description is important. This description should all include the test condition of all dependent rules
    - Dependency 1 ( Natural Language description of the dependency 1 )
    - Dependency 2 ( Natural Language description of the dependency 2 )

</example_response>

    `,
  ],
  [
    'human',
    `
Given the title, description and query of a Qradar custom rule below. Create a natural language description of the rule along with details of all its dependencies that were resolved. Use the tool to resolve dependencies as required.

Title: {title}
Description: {description}
Query: {query}
  `,
  ],
]);
