/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiTitle,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

import { KeywordSearch } from './keyword_search';
import { SemanticSearch } from './semantic_search';
import { VectorSearch } from './vector_search';

const SEARCH_CAPABILITIES = [
  {
    label: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.semanticSearch', {
      defaultMessage: 'Semantic search',
    }),
    value: 'semantic',
  },
  {
    label: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch', {
      defaultMessage: 'Vector search',
    }),
    value: 'vector',
  },
  {
    label: i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch', {
      defaultMessage: 'Keyword search',
    }),
    value: 'keyword',
  },
];

const capabilityComponents: Record<string, React.FC> = {
  semantic: SemanticSearch,
  vector: VectorSearch,
  keyword: KeywordSearch,
};

export const AISearchCapabilities: React.FC = () => {
  const [selectedCapability, setSelectedCapability] = useState<string>(
    SEARCH_CAPABILITIES[0].value
  );
  const currentBreakpoint = useCurrentEuiBreakpoint();

  const SelectedComponent = capabilityComponents[selectedCapability];

  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.searchHomepage.aiSearchCapabilities.title', {
              defaultMessage: 'Explore Elastic’s AI search capabilities',
            })}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="xl"
          direction={currentBreakpoint === 's' || currentBreakpoint === 'm' ? 'column' : 'row'}
        >
          <EuiFlexItem grow={1}>
            <EuiListGroup>
              {SEARCH_CAPABILITIES.map((capability) => (
                <EuiListGroupItem
                  key={capability.value}
                  color="primary"
                  label={capability.label}
                  onClick={() => setSelectedCapability(capability.value)}
                  isActive={selectedCapability === capability.value}
                  data-test-subj={`aiSearchCapabilities-item-${capability.value}`}
                />
              ))}
            </EuiListGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <SelectedComponent />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
