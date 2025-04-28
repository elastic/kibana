/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiSpacer,
  useGeneratedHtmlId,
  EuiRadioGroup,
  EuiTitle,
  EuiRadioGroupOption,
  EuiText,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ } from '../../test_subjects';

export const SetupTechnologySelector = ({
  disabled,
  isAgentless,
  onSetupTechnologyChange,
  showLimitationsMessage = true,
}: {
  disabled: boolean;
  setupTechnology: SetupTechnology;
  isAgentless: boolean;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
  showLimitationsMessage?: boolean;
}) => {
  const radioGroupItemId1 = useGeneratedHtmlId({
    prefix: 'radioGroupItem',
    suffix: 'agentless',
  });
  const radioGroupItemId2 = useGeneratedHtmlId({
    prefix: 'radioGroupItem',
    suffix: 'agentbased',
  });
  const radioOptions: EuiRadioGroupOption[] = [
    {
      id: radioGroupItemId1,
      value: SetupTechnology.AGENTLESS,
      label: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentlessRadioLabel"
              defaultMessage="Agentless"
            />
          </strong>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioDescription"
                defaultMessage="Setup integration without an agent"
              />
            </p>
          </EuiText>
          <EuiSpacer size="xs" />
        </>
      ),
    },
    {
      id: radioGroupItemId2,
      value: SetupTechnology.AGENT_BASED,
      label: (
        <>
          <strong>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioLabel"
              defaultMessage="Agent-based"
            />
          </strong>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioDescription"
                defaultMessage="Deploy an Elastic Agent into your cloud environment"
              />
            </p>
          </EuiText>
        </>
      ),
    },
  ];

  const [radioIdSelected, setRadioIdSelected] = useState(
    isAgentless ? radioGroupItemId1 : radioGroupItemId2
  );

  useEffect(() => {
    setRadioIdSelected(isAgentless ? radioGroupItemId1 : radioGroupItemId2);
  }, [isAgentless, radioGroupItemId1, radioGroupItemId2, setRadioIdSelected]);

  const onChange = (optionId: string) => {
    setRadioIdSelected(optionId);
    onSetupTechnologyChange(
      optionId === radioGroupItemId1 ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED
    );
  };

  const limitationsMessage = (
    <FormattedMessage
      id="xpack.csp.setupTechnologySelector.comingSoon"
      defaultMessage="Agentless deployment is not supported if you are using {link}."
      values={{
        link: (
          <EuiLink
            href="https://www.elastic.co/guide/en/cloud-enterprise/current/ece-traffic-filtering-deployment-configuration.html"
            target="_blank"
          >
            Traffic filtering
          </EuiLink>
        ),
      }}
    />
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.setupTechnologySelector.deploymentOptionsTitle"
            defaultMessage="Deployment options"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {showLimitationsMessage && (
        <EuiCallOut title={limitationsMessage} color="warning" iconType="alert" size="m" />
      )}
      <EuiSpacer size="m" />
      <EuiRadioGroup
        disabled={disabled}
        data-test-subj={SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ}
        options={radioOptions}
        idSelected={radioIdSelected}
        onChange={(id) => onChange(id)}
        name="radio group"
      />
    </>
  );
};
