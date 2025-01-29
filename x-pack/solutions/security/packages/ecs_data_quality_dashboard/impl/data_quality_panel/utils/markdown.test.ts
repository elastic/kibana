/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

import { EMPTY_STAT } from '../constants';
import {
  escapeNewlines,
  escapePreserveNewlines,
  getAllIncompatibleMarkdownComments,
  getAllowedValues,
  getCodeFormattedValue,
  getHeaderSeparator,
  getIncompatibleFieldsMarkdownComment,
  getIncompatibleFieldsMarkdownTablesComment,
  getIncompatibleMappings,
  getIncompatibleMappingsMarkdownTableRows,
  getIncompatibleValues,
  getIncompatibleValuesMarkdownTableRows,
  getIndexInvalidValues,
  getMarkdownComment,
  getMarkdownTable,
  getMarkdownTableHeader,
  getResultEmoji,
  getStatsRollupMarkdownComment,
  getSummaryMarkdownComment,
  getSummaryTableMarkdownComment,
  getSummaryTableMarkdownHeader,
  getSummaryTableMarkdownRow,
  getTabCountsMarkdownComment,
} from './markdown';
import { mockPartitionedFieldMetadata } from '../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { mockAllowedValues } from '../mock/allowed_values/mock_allowed_values';
import { UnallowedValueCount } from '../types';
import {
  eventCategory,
  hostNameWithTextMapping,
  mockIncompatibleMappings,
  sourceIpWithTextMapping,
} from '../mock/enriched_field_metadata/mock_enriched_field_metadata';
import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  ECS_MAPPING_TYPE_EXPECTED,
  FIELD,
  INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE,
  INDEX_MAPPING_TYPE_ACTUAL,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../translations';
import { EcsVersion } from '@elastic/ecs';

const indexName = 'auditbeat-custom-index-1';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

describe('getHeaderSeparator', () => {
  test('it returns a sequence of dashes equal to the length of the header, plus two additional dashes to pad each end of the cntent', () => {
    const content = '0123456789'; // content.length === 10
    const expected = '------------'; // expected.length === 12

    expect(getHeaderSeparator(content)).toEqual(expected);
  });
});

describe('getCodeFormattedValue', () => {
  test('it returns the expected placeholder when `value` is undefined', () => {
    expect(getCodeFormattedValue(undefined)).toEqual('`--`');
  });

  test('it returns the content formatted as markdown code', () => {
    const value = 'foozle';

    expect(getCodeFormattedValue(value)).toEqual('`foozle`');
  });

  test('it escapes content such that `value` may be included in a markdown table cell', () => {
    const value =
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';

    expect(getCodeFormattedValue(value)).toEqual(
      '`\\| there were newlines and column separators in the beginning, middle, \\|and end\\| `'
    );
  });
});

describe('getStatsRollupMarkdownComment', () => {
  test('it returns the expected comment', () => {
    expect(
      getStatsRollupMarkdownComment({
        docsCount: 57410,
        formatBytes,
        formatNumber,
        incompatible: 3,
        indices: 25,
        indicesChecked: 1,
        sizeInBytes: 28413,
      })
    ).toEqual(
      '| Incompatible fields | Indices checked | Indices | Size | Docs |\n|---------------------|-----------------|---------|------|------|\n| 3 | 1 | 25 | 27.7KB | 57,410 |\n'
    );
  });

  test('it returns the expected comment when optional values are undefined', () => {
    expect(
      getStatsRollupMarkdownComment({
        docsCount: 0,
        formatBytes,
        formatNumber,
        incompatible: undefined,
        indices: undefined,
        indicesChecked: undefined,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Incompatible fields | Indices checked | Indices | Docs |\n|---------------------|-----------------|---------|------|\n| -- | -- | -- | 0 |\n'
    );
  });
});

describe('getSummaryTableMarkdownHeader', () => {
  test('it returns the expected header', () => {
    const isILMAvailable = true;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|'
    );
  });

  test('it returns the expected header when isILMAvailable is false', () => {
    const isILMAvailable = false;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|'
    );
  });

  test('it returns the expected header when displayDocSize is false', () => {
    const isILMAvailable = false;
    expect(getSummaryTableMarkdownHeader(isILMAvailable)).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|'
    );
  });
});

describe('getSummaryTableMarkdownRow', () => {
  test('it returns the expected row when all values are provided', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatibleFieldsCount: 3,
        ilmPhase: 'unmanaged',
        isILMAvailable: true,
        indexName: 'auditbeat-custom-index-1',
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual('| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n');
  });

  test('it returns the expected row when optional values are NOT provided', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatibleFieldsCount: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- | -- | 27.7KB |\n');
  });

  test('it returns the expected row when isILMAvailable is false', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatibleFieldsCount: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- |\n');
  });

  test('it returns the expected row when sizeInBytes is undefined', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatibleFieldsCount: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 (0.0%) | -- |\n');
  });

  test('it returns the expected row when patternDocsCount is undefined', () => {
    expect(
      getSummaryTableMarkdownRow({
        docsCount: 4,
        formatBytes,
        formatNumber,
        incompatibleFieldsCount: undefined, // <--
        ilmPhase: undefined, // <--
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        patternDocsCount: undefined,
        sizeInBytes: undefined,
      })
    ).toEqual('| -- | auditbeat-custom-index-1 | 4 | -- |\n');
  });
});

describe('getResultEmoji', () => {
  test('it returns the expected placeholder when `incompatible` is undefined', () => {
    expect(getResultEmoji(undefined)).toEqual('--');
  });

  test('it returns a ✅ when the incompatible count is zero', () => {
    expect(getResultEmoji(0)).toEqual('✅');
  });

  test('it returns a ❌ when the incompatible count is NOT zero', () => {
    expect(getResultEmoji(1)).toEqual('❌');
  });
});

describe('getMarkdownTableHeader', () => {
  const headerNames = [
    '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n',
    'A second column',
    'A third column',
  ];

  test('it returns the expected table header', () => {
    expect(getMarkdownTableHeader(headerNames)).toEqual(
      '\n| \\| there were newlines and column separators in the beginning, middle, \\|and end\\|  | A second column | A third column | \n|----------------------------------------------------------------------------------|-----------------|----------------|'
    );
  });
});

describe('getSummaryTableMarkdownComment', () => {
  test('it returns the expected comment', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        incompatibleFieldsCount: 3,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n'
    );
  });

  test('it returns the expected comment when isILMAvailable is false', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        incompatibleFieldsCount: 3,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n'
    );
  });

  test('it returns the expected comment when sizeInBytes is undefined', () => {
    expect(
      getSummaryTableMarkdownComment({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        incompatibleFieldsCount: 3,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual(
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 |\n\n'
    );
  });
});

describe('escapeNewlines', () => {
  test("it returns the content unmodified when there's nothing to escape", () => {
    const content = "there's nothing to escape in this content";
    expect(escapeNewlines(content)).toEqual(content);
  });

  test('it replaces all newlines in the content with spaces', () => {
    const content = '\nthere were newlines in the beginning, middle,\nand end\n';
    expect(escapeNewlines(content)).toEqual(
      ' there were newlines in the beginning, middle, and end '
    );
  });

  test('it escapes all column separators in the content with spaces', () => {
    const content = '|there were column separators in the beginning, middle,|and end|';
    expect(escapeNewlines(content)).toEqual(
      '\\|there were column separators in the beginning, middle,\\|and end\\|'
    );
  });

  test('it escapes content containing BOTH newlines and column separators', () => {
    const content =
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';
    expect(escapeNewlines(content)).toEqual(
      '\\| there were newlines and column separators in the beginning, middle, \\|and end\\| '
    );
  });
});

describe('escapePreserveNewlines', () => {
  test('it returns undefined when `content` is undefined', () => {
    expect(escapePreserveNewlines(undefined)).toBeUndefined();
  });

  test("it returns the content unmodified when there's nothing to escape", () => {
    const content = "there's (also) nothing to escape in this content";
    expect(escapePreserveNewlines(content)).toEqual(content);
  });

  test('it escapes all column separators in the content with spaces', () => {
    const content = '|there were column separators in the beginning, middle,|and end|';
    expect(escapePreserveNewlines(content)).toEqual(
      '\\|there were column separators in the beginning, middle,\\|and end\\|'
    );
  });

  test('it does NOT escape newlines in the content', () => {
    const content =
      '|\nthere were newlines and column separators in the beginning, middle,\n|and end|\n';
    expect(escapePreserveNewlines(content)).toEqual(
      '\\|\nthere were newlines and column separators in the beginning, middle,\n\\|and end\\|\n'
    );
  });
});

describe('getAllowedValues', () => {
  test('it returns the expected placeholder when `allowedValues` is undefined', () => {
    expect(getAllowedValues(undefined)).toEqual('`--`');
  });

  test('it joins the `allowedValues` `name`s as a markdown-code-formatted, comma separated, string', () => {
    expect(getAllowedValues(mockAllowedValues)).toEqual(
      '`authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web`'
    );
  });
});

describe('getIndexInvalidValues', () => {
  test('it returns the expected placeholder when `indexInvalidValues` is empty', () => {
    expect(getIndexInvalidValues([])).toEqual('`--`');
  });

  test('it returns markdown-code-formatted `fieldName`s, and their associated `count`s', () => {
    const indexInvalidValues: UnallowedValueCount[] = [
      {
        count: 2,
        fieldName: 'an_invalid_category',
      },
      {
        count: 1,
        fieldName: 'theory',
      },
    ];

    expect(getIndexInvalidValues(indexInvalidValues)).toEqual(
      `\`an_invalid_category\` (2), \`theory\` (1)`
    );
  });
});

describe('getIncompatibleMappingsMarkdownTableRows', () => {
  test('it returns the expected table rows', () => {
    expect(
      getIncompatibleMappingsMarkdownTableRows([hostNameWithTextMapping, sourceIpWithTextMapping])
    ).toEqual('| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |');
  });
});

describe('getIncompatibleValuesMarkdownTableRows', () => {
  test('it returns the expected table rows', () => {
    expect(
      getIncompatibleValuesMarkdownTableRows([
        {
          ...eventCategory,
          hasEcsMetadata: true,
          indexInvalidValues: [
            {
              count: 2,
              fieldName: 'an_invalid_category',
            },
            {
              count: 1,
              fieldName: 'theory',
            },
          ],
          isEcsCompliant: false,
        },
      ])
    ).toEqual(
      '| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |'
    );
  });
});

describe('getMarkdownComment', () => {
  test('it returns the expected markdown comment', () => {
    const suggestedAction =
      '|\nthere were newlines and column separators in this suggestedAction beginning, middle,\n|and end|\n';
    const title =
      '|\nthere were newlines and column separators in this title beginning, middle,\n|and end|\n';

    expect(getMarkdownComment({ suggestedAction, title })).toEqual(
      '#### \\| there were newlines and column separators in this title beginning, middle, \\|and end\\| \n\n\\|\nthere were newlines and column separators in this suggestedAction beginning, middle,\n\\|and end\\|\n'
    );
  });
});

describe('getMarkdownTable', () => {
  test('it returns the expected table contents', () => {
    expect(
      getMarkdownTable({
        enrichedFieldMetadata: mockIncompatibleMappings,
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    ).toEqual(
      '#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n'
    );
  });

  test('it returns an empty string when `enrichedFieldMetadata` is empty', () => {
    expect(
      getMarkdownTable({
        enrichedFieldMetadata: [], // <-- empty
        getMarkdownTableRows: getIncompatibleMappingsMarkdownTableRows,
        headerNames: [FIELD, ECS_MAPPING_TYPE_EXPECTED, INDEX_MAPPING_TYPE_ACTUAL],
        title: INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE(indexName),
      })
    ).toEqual('');
  });
});

describe('getIncompatibleFieldsMarkdownComment', () => {
  test('it returns the expected counts and ECS version', () => {
    expect(getIncompatibleFieldsMarkdownComment(11)).toEqual(`#### 11 incompatible fields

Fields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.

${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${PAGES_MAY_NOT_DISPLAY_EVENTS}
${MAPPINGS_THAT_CONFLICT_WITH_ECS}
`);
  });
});

describe('getIncompatibleMappings', () => {
  test('it (only) returns the mappings where type !== indexFieldType', () => {
    expect(getIncompatibleMappings(mockPartitionedFieldMetadata.incompatible)).toEqual([
      {
        dashed_name: 'host-name',
        description:
          'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
        flat_name: 'host.name',
        hasEcsMetadata: true,
        ignore_above: 1024,
        indexFieldName: 'host.name',
        indexFieldType: 'text',
        indexInvalidValues: [],
        isEcsCompliant: false,
        isInSameFamily: false,
        level: 'core',
        name: 'name',
        normalize: [],
        short: 'Name of the host.',
        type: 'keyword',
      },
      {
        dashed_name: 'source-ip',
        description: 'IP address of the source (IPv4 or IPv6).',
        flat_name: 'source.ip',
        hasEcsMetadata: true,
        indexFieldName: 'source.ip',
        indexFieldType: 'text',
        indexInvalidValues: [],
        isEcsCompliant: false,
        isInSameFamily: false,
        level: 'core',
        name: 'ip',
        normalize: [],
        short: 'IP address of the source.',
        type: 'ip',
      },
    ]);
  });
});

describe('getIncompatibleValues', () => {
  test('it (only) returns the mappings with indexInvalidValues', () => {
    expect(getIncompatibleValues(mockPartitionedFieldMetadata.incompatible)).toEqual([
      {
        allowed_values: [
          {
            description:
              'Events in this category are related to the challenge and response process in which credentials are supplied and verified to allow the creation of a session. Common sources for these logs are Windows event logs and ssh logs. Visualize and analyze events in this category to look for failed logins, and other authentication-related activity.',
            expected_event_types: ['start', 'end', 'info'],
            name: 'authentication',
          },
          {
            description:
              'Events in the configuration category have to deal with creating, modifying, or deleting the settings or parameters of an application, process, or system.\nExample sources include security policy change logs, configuration auditing logging, and system integrity monitoring.',
            expected_event_types: ['access', 'change', 'creation', 'deletion', 'info'],
            name: 'configuration',
          },
          {
            description:
              'The database category denotes events and metrics relating to a data storage and retrieval system. Note that use of this category is not limited to relational database systems. Examples include event logs from MS SQL, MySQL, Elasticsearch, MongoDB, etc. Use this category to visualize and analyze database activity such as accesses and changes.',
            expected_event_types: ['access', 'change', 'info', 'error'],
            name: 'database',
          },
          {
            description:
              'Events in the driver category have to do with operating system device drivers and similar software entities such as Windows drivers, kernel extensions, kernel modules, etc.\nUse events and metrics in this category to visualize and analyze driver-related activity and status on hosts.',
            expected_event_types: ['change', 'end', 'info', 'start'],
            name: 'driver',
          },
          {
            description:
              'This category is used for events relating to email messages, email attachments, and email network or protocol activity.\nEmails events can be produced by email security gateways, mail transfer agents, email cloud service providers, or mail server monitoring applications.',
            expected_event_types: ['info'],
            name: 'email',
          },
          {
            description:
              'Relating to a set of information that has been created on, or has existed on a filesystem. Use this category of events to visualize and analyze the creation, access, and deletions of files. Events in this category can come from both host-based and network-based sources. An example source of a network-based detection of a file transfer would be the Zeek file.log.',
            expected_event_types: ['change', 'creation', 'deletion', 'info'],
            name: 'file',
          },
          {
            description:
              'Use this category to visualize and analyze information such as host inventory or host lifecycle events.\nMost of the events in this category can usually be observed from the outside, such as from a hypervisor or a control plane\'s point of view. Some can also be seen from within, such as "start" or "end".\nNote that this category is for information about hosts themselves; it is not meant to capture activity "happening on a host".',
            expected_event_types: ['access', 'change', 'end', 'info', 'start'],
            name: 'host',
          },
          {
            description:
              'Identity and access management (IAM) events relating to users, groups, and administration. Use this category to visualize and analyze IAM-related logs and data from active directory, LDAP, Okta, Duo, and other IAM systems.',
            expected_event_types: [
              'admin',
              'change',
              'creation',
              'deletion',
              'group',
              'info',
              'user',
            ],
            name: 'iam',
          },
          {
            description:
              'Relating to intrusion detections from IDS/IPS systems and functions, both network and host-based. Use this category to visualize and analyze intrusion detection alerts from systems such as Snort, Suricata, and Palo Alto threat detections.',
            expected_event_types: ['allowed', 'denied', 'info'],
            name: 'intrusion_detection',
          },
          {
            description:
              'Malware detection events and alerts. Use this category to visualize and analyze malware detections from EDR/EPP systems such as Elastic Endpoint Security, Symantec Endpoint Protection, Crowdstrike, and network IDS/IPS systems such as Suricata, or other sources of malware-related events such as Palo Alto Networks threat logs and Wildfire logs.',
            expected_event_types: ['info'],
            name: 'malware',
          },
          {
            description:
              'Relating to all network activity, including network connection lifecycle, network traffic, and essentially any event that includes an IP address. Many events containing decoded network protocol transactions fit into this category. Use events in this category to visualize or analyze counts of network ports, protocols, addresses, geolocation information, etc.',
            expected_event_types: [
              'access',
              'allowed',
              'connection',
              'denied',
              'end',
              'info',
              'protocol',
              'start',
            ],
            name: 'network',
          },
          {
            description:
              'Relating to software packages installed on hosts. Use this category to visualize and analyze inventory of software installed on various hosts, or to determine host vulnerability in the absence of vulnerability scan data.',
            expected_event_types: ['access', 'change', 'deletion', 'info', 'installation', 'start'],
            name: 'package',
          },
          {
            description:
              'Use this category of events to visualize and analyze process-specific information such as lifecycle events or process ancestry.',
            expected_event_types: ['access', 'change', 'end', 'info', 'start'],
            name: 'process',
          },
          {
            description:
              'Having to do with settings and assets stored in the Windows registry. Use this category to visualize and analyze activity such as registry access and modifications.',
            expected_event_types: ['access', 'change', 'creation', 'deletion'],
            name: 'registry',
          },
          {
            description:
              'The session category is applied to events and metrics regarding logical persistent connections to hosts and services. Use this category to visualize and analyze interactive or automated persistent connections between assets. Data for this category may come from Windows Event logs, SSH logs, or stateless sessions such as HTTP cookie-based sessions, etc.',
            expected_event_types: ['start', 'end', 'info'],
            name: 'session',
          },
          {
            description:
              "Use this category to visualize and analyze events describing threat actors' targets, motives, or behaviors.",
            expected_event_types: ['indicator'],
            name: 'threat',
          },
          {
            description:
              'Relating to vulnerability scan results. Use this category to analyze vulnerabilities detected by Tenable, Qualys, internal scanners, and other vulnerability management sources.',
            expected_event_types: ['info'],
            name: 'vulnerability',
          },
          {
            description:
              'Relating to web server access. Use this category to create a dashboard of web server/proxy activity from apache, IIS, nginx web servers, etc. Note: events from network observers such as Zeek http log may also be included in this category.',
            expected_event_types: ['access', 'error', 'info'],
            name: 'web',
          },
        ],
        dashed_name: 'event-category',
        description:
          'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
        example: 'authentication',
        flat_name: 'event.category',
        ignore_above: 1024,
        level: 'core',
        name: 'category',
        normalize: ['array'],
        short: 'Event category. The second categorization field in the hierarchy.',
        type: 'keyword',
        indexFieldName: 'event.category',
        indexFieldType: 'keyword',
        indexInvalidValues: [
          { count: 2, fieldName: 'an_invalid_category' },
          { count: 1, fieldName: 'theory' },
        ],
        hasEcsMetadata: true,
        isEcsCompliant: false,
        isInSameFamily: false,
      },
    ]);
  });
});

describe('getIncompatibleFieldsMarkdownTablesComment', () => {
  test('it returns the expected comment when the index has `incompatibleMappings` and `incompatibleValues`', () => {
    expect(
      getIncompatibleFieldsMarkdownTablesComment({
        incompatibleMappingsFields: [
          mockPartitionedFieldMetadata.incompatible[1],
          mockPartitionedFieldMetadata.incompatible[2],
        ],
        incompatibleValuesFields: [mockPartitionedFieldMetadata.incompatible[0]],
        indexName: 'auditbeat-custom-index-1',
      })
    ).toEqual(
      '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n'
    );
  });

  test('it returns the expected comment when the index does NOT have `incompatibleMappings` and `incompatibleValues`', () => {
    expect(
      getIncompatibleFieldsMarkdownTablesComment({
        incompatibleMappingsFields: [], // <-- no `incompatibleMappings`
        incompatibleValuesFields: [], // <-- no `incompatibleValues`
        indexName: 'auditbeat-custom-index-1',
      })
    ).toEqual('\n\n\n');
  });
});

describe('getAllIncompatibleMarkdownComments', () => {
  test('it returns the expected collection of comments', () => {
    expect(
      getAllIncompatibleMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        isILMAvailable: true,
        indexName: 'auditbeat-custom-index-1',
        incompatibleMappingsFields: [
          mockPartitionedFieldMetadata.incompatible[1],
          mockPartitionedFieldMetadata.incompatible[2],
        ],
        incompatibleValuesFields: [mockPartitionedFieldMetadata.incompatible[0]],
        sameFamilyFieldsCount: 0,
        customFieldsCount: 4,
        ecsCompliantFieldsCount: 2,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` | 27.7KB |\n\n',
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      `#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version ${EcsVersion}.\n\n${DETECTION_ENGINE_RULES_MAY_NOT_MATCH}\n${PAGES_MAY_NOT_DISPLAY_EVENTS}\n${MAPPINGS_THAT_CONFLICT_WITH_ECS}\n`,
      '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
    ]);
  });

  test('it returns the expected comment when `incompatible` is empty', () => {
    expect(
      getAllIncompatibleMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: true,
        incompatibleMappingsFields: [],
        incompatibleValuesFields: [],
        sameFamilyFieldsCount: 0,
        customFieldsCount: 4,
        ecsCompliantFieldsCount: 2,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: 28413,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 | `unmanaged` | 27.7KB |\n\n',
      '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      '\n\n\n',
    ]);
  });

  test('it returns the expected comment when `isILMAvailable` is false', () => {
    expect(
      getAllIncompatibleMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        incompatibleMappingsFields: [],
        incompatibleValuesFields: [],
        sameFamilyFieldsCount: 0,
        customFieldsCount: 4,
        ecsCompliantFieldsCount: 2,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 |\n\n',
      '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      '\n\n\n',
    ]);
  });

  test('it returns the expected comment when `sizeInBytes` is not an integer', () => {
    expect(
      getAllIncompatibleMarkdownComments({
        docsCount: 4,
        formatBytes,
        formatNumber,
        ilmPhase: 'unmanaged',
        indexName: 'auditbeat-custom-index-1',
        isILMAvailable: false,
        incompatibleMappingsFields: [],
        incompatibleValuesFields: [],
        sameFamilyFieldsCount: 0,
        customFieldsCount: 4,
        ecsCompliantFieldsCount: 2,
        allFieldsCount: 9,
        patternDocsCount: 57410,
        sizeInBytes: undefined,
      })
    ).toEqual([
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ✅ | auditbeat-custom-index-1 | 4 (0.0%) | 0 |\n\n',
      '### **Incompatible fields** `0` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      '\n\n\n',
    ]);
  });
});

describe('getSummaryMarkdownComment', () => {
  test('it returns the expected markdown comment', () => {
    expect(getSummaryMarkdownComment(indexName)).toEqual('### auditbeat-custom-index-1\n');
  });
});

describe('getTabCountsMarkdownComment', () => {
  test('it returns a comment with the expected counts', () => {
    expect(
      getTabCountsMarkdownComment({
        incompatibleFieldsCount: 3,
        sameFamilyFieldsCount: 0,
        customFieldsCount: 4,
        ecsCompliantFieldsCount: 2,
        allFieldsCount: 9,
      })
    ).toBe(
      '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n'
    );
  });
});
