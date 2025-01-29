/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiSpacer,
  useGeneratedHtmlId,
  EuiFlexItem,
  EuiFlexGroup,
  EuiRadioGroup,
  EuiTitle,
  EuiRadioGroupOption,
} from '@elastic/eui';
import { SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ } from '../../test_subjects';

export const SetupTechnologySelector = ({
  disabled,
  setupTechnology,
  onSetupTechnologyChange,
}: {
  disabled: boolean;
  setupTechnology: SetupTechnology;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
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
        <EuiFlexGroup gutterSize="xs" direction="column" aria-label={'Deployment Modes Selection'}>
          <EuiFlexItem grow={false}>
            <p>
              <strong>
                <FormattedMessage
                  id="xpack.csp.fleetIntegration.setupTechnology.agentlessRadioLabel"
                  defaultMessage="Agentless"
                />
              </strong>
            </p>
          </EuiFlexItem>
          <EuiFlexItem>
            <p>
              <FormattedMessage
                id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioDescription"
                defaultMessage="Setup integration without an agent"
              />
            </p>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      id: radioGroupItemId2,
      value: SetupTechnology.AGENT_BASED,
      label: (
        <EuiFlexGroup gutterSize="xs" direction="column" aria-label={'Agent-based'}>
          <EuiFlexItem grow={false}>
            <p>
              <strong>
                <FormattedMessage
                  id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioLabel"
                  defaultMessage="Agent-based"
                />
              </strong>
            </p>
          </EuiFlexItem>
          <EuiFlexItem>
            <FormattedMessage
              id="xpack.csp.fleetIntegration.setupTechnology.agentBasedRadioDescription"
              defaultMessage="Deploy Elastic Agent into your Cloud Account"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  const [radioIdSelected, setRadioIdSelected] = useState(
    SetupTechnology.AGENTLESS === setupTechnology ? radioGroupItemId1 : radioGroupItemId2
  );

  const onChange = (optionId: string) => {
    setRadioIdSelected(optionId);
    onSetupTechnologyChange(
      optionId === radioGroupItemId1 ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED
    );
  };

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.setupTechnologySelector.deploymentOptionsTitle"
            defaultMessage="Deployment Options"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
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
