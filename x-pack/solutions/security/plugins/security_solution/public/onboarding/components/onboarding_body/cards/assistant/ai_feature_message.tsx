/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import {
  ELASTIC_LLM_AI_FEATURES,
  ELASTIC_LLM_THIRD_PARTY,
  ELASTIC_LLM_USAGE_COSTS,
} from '@kbn/elastic-assistant/impl/tour/elastic_llm/translations';
import { useKibana } from '../../../../../common/lib/kibana';

export const ElasticAIFeatureMessage = React.memo(() => {
  const {
    docLinks: {
      links: {
        securitySolution: {
          elasticAiFeatures: ELASTIC_AI_FEATURES_LINK,
          thirdPartyLlmProviders: THIRD_PARTY_LLM_LINK,
        },
        observability: { elasticManagedLlmUsageCost: ELASTIC_LLM_USAGE_COST_LINK },
      },
    },
  } = useKibana().services;

  return (
    <FormattedMessage
      id="xpack.securitySolution.onboarding.assistantCard.elasticAIFeature.content"
      defaultMessage="{elasticAiFeatures} require an LLM connector. You can use the Elastic Managed LLM connector, which is available by default, or {thirdParty}. Learn more about Elastic Managed LLM connector's {usageCost}."
      values={{
        elasticAiFeatures: (
          <EuiLink
            href={ELASTIC_AI_FEATURES_LINK}
            target="_blank"
            rel="noopener noreferrer"
            external
          >
            {ELASTIC_LLM_AI_FEATURES}
          </EuiLink>
        ),
        usageCost: (
          <EuiLink
            href={ELASTIC_LLM_USAGE_COST_LINK}
            target="_blank"
            rel="noopener noreferrer"
            external
          >
            {ELASTIC_LLM_USAGE_COSTS}
          </EuiLink>
        ),
        thirdParty: (
          <EuiLink href={THIRD_PARTY_LLM_LINK} target="_blank" rel="noopener noreferrer" external>
            {ELASTIC_LLM_THIRD_PARTY}
          </EuiLink>
        ),
      }}
    />
  );
});

ElasticAIFeatureMessage.displayName = 'ElasticAIFeatureMessage';
