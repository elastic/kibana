/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { EsqlKnowledgeBase } from '../../../../../../../common/task/util/esql_knowledge_base';
import { getTranslateRuleNode } from './translate_rule';

describe('getTranslateRuleNode', () => {
  const logger = loggerMock.create();
  const esqlKnowledgeBase = {
    translate: jest.fn(),
  } as unknown as jest.Mocked<EsqlKnowledgeBase>;

  beforeEach(() => {
    jest.clearAllMocks();
    esqlKnowledgeBase.translate.mockResolvedValue(`\`\`\`esql
FROM logs-*
| LOOKUP JOIN lookup_default_threat_intel_ip ON destination.ip == ip
\`\`\`
## Translation Summary
- Translated rule.`);
  });

  it('adds enriched lookup runtime fields to the translation knowledge base', async () => {
    const node = getTranslateRuleNode({ esqlKnowledgeBase, logger });
    type TranslateRuleNode = typeof node;

    await node(
      {
        original_rule: {
          id: 'rule-1',
          vendor: 'splunk',
          query_language: 'spl',
          title: 'Threat Intel IP',
          description: 'Detects connections to threat intel IPs',
          query: 'index=main | lookup threat_intel_ip ip AS destination.ip',
        },
        inline_query: 'index=main | lookup lookup_default_threat_intel_ip ip AS destination.ip',
        resources: {
          lookup: [
            {
              type: 'lookup',
              name: 'threat_intel_ip',
              content: 'lookup_default_threat_intel_ip',
              fields: [
                { path: 'ip', type: 'ip' },
                { path: 'threat_category', type: 'keyword' },
              ],
            },
          ],
        },
        integration: {
          knowledge_base: 'integration context',
        },
      } as Parameters<TranslateRuleNode>[0],
      {} as Parameters<TranslateRuleNode>[1]
    );

    expect(esqlKnowledgeBase.translate).toHaveBeenCalledWith(
      expect.stringContaining(`<lookup_resource source_name="threat_intel_ip" index="lookup_default_threat_intel_ip">
<fields>
<field name="ip" type="ip" />
<field name="threat_category" type="keyword" />
</fields>
</lookup_resource>`)
    );
    expect(esqlKnowledgeBase.translate).toHaveBeenCalledWith(
      expect.stringContaining(
        '<rule>When source and lookup field names differ, use LOOKUP JOIN lookup_index ON source_field == lookup_field.</rule>'
      )
    );
    expect(esqlKnowledgeBase.translate).toHaveBeenCalledWith(
      expect.stringContaining('integration context')
    );
  });
});
