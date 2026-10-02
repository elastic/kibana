/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiLink, EuiText, EuiTourStep, type EuiTourStepProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../common/doc_links';
import { useShowManagedLLMCostTour } from '../hooks/use_show_managed_llm_cost_tour';

export interface ElasticLLMCostTourProps {
  connectorName: string;
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  children: React.ReactElement;
}

export const ElasticLLMCostTour = ({
  anchorPosition = 'downCenter',
  connectorName,
  children,
}: ElasticLLMCostTourProps) => {
  const { isTourVisible, onSkipTour } = useShowManagedLLMCostTour();

  return (
    <EuiTourStep
      title={
        <FormattedMessage
          id="xpack.searchPlayground.elasticLLM.costsTour.title"
          defaultMessage="{connectorName} connector"
          values={{
            connectorName,
          }}
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.searchPlayground.elasticLLM.costsTour.subTitle"
          defaultMessage="New AI feature!"
        />
      }
      maxWidth="500px"
      content={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.elasticLLM.costsTour.description"
              defaultMessage="{connectorName} is our new default, pre-configured LLM connector. It will incur {additionalCostsLink} You can continue to use other LLM connectors as normal. {learnMoreLink}"
              values={{
                connectorName,
                additionalCostsLink: (
                  <EuiLink
                    data-test-subj="elasticLLMAdditionalCostsLink"
                    target="_blank"
                    href={docLinks.elasticLLMCosts}
                  >
                    <FormattedMessage
                      id="xpack.searchPlayground.elasticLLM.costsTour.additionalCostsLink"
                      defaultMessage="additional costs."
                    />
                  </EuiLink>
                ),
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="elasticLLMLearnMoreLink"
                    target="_blank"
                    href={docLinks.elasticLLM}
                  >
                    <FormattedMessage
                      id="xpack.searchPlayground.elasticLLM.costsTour.learnModeLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      }
      isStepOpen={isTourVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={onSkipTour}
      footerAction={
        <EuiButtonEmpty data-test-subj="elasticLLMCostsTourCloseBtn" onClick={onSkipTour}>
          <FormattedMessage
            id="xpack.searchPlayground.elasticLLM.costsTour.closeButton"
            defaultMessage="Ok"
          />
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
};
