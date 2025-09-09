/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { useSyntheticsSettingsContext } from '../../../../contexts';
import { getAgentPoliciesAction } from '../../../../state/agent_policies';
import type { MonitorInspectResponse } from '../../../../state/monitor_management/api';
import { PolicyName } from '../../../settings/private_locations/policy_name';

export const PackagePolicyLink = ({
  data,
  asJson,
}: {
  data: MonitorInspectResponse;
  asJson?: boolean;
}) => {
  const dispatch = useDispatch();
  const { basePath } = useSyntheticsSettingsContext();

  useEffect(() => {
    if (data.privateConfig?.policy_id) {
      dispatch(getAgentPoliciesAction.get());
    }
  }, [data.privateConfig, dispatch]);

  if (!data.privateConfig?.policy_id) {
    return null;
  }

  const packagePolicyLink = `${basePath}/app/fleet/policies/${data.privateConfig?.policy_id}/edit-integration/${data.privateConfig.id}`;

  return (
    <EuiAccordion
      id="packagePolicyData"
      buttonContent={
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.synthetics.packagePolicyLink.viewPackagePolicyLinkLabel', {
              defaultMessage: 'View package policy data',
            })}
          </h3>
        </EuiTitle>
      }
    >
      <EuiText className="eui-displayInlineBlock">
        {i18n.translate('xpack.synthetics.packagePolicyLink.agentPolicyTextLabel', {
          defaultMessage: 'Agent policy: ',
        })}
        <PolicyName agentPolicyId={data.privateConfig.policy_id!} />
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText className="eui-displayInlineBlock">
        {i18n.translate('xpack.synthetics.packagePolicyLink.agentPolicyTextLabel', {
          defaultMessage: 'Package policy link: ',
        })}
        <EuiLink data-test-subj="syntheticsPackagePolicyLinkLink" href={packagePolicyLink}>
          {data.privateConfig.name}
        </EuiLink>
      </EuiText>
      <EuiPanel color="subdued">
        <EuiCodeBlock
          language={asJson ? 'json' : 'yaml'}
          fontSize="m"
          paddingSize="m"
          lineNumbers
          isCopyable={true}
        >
          {JSON.stringify(data.privateConfig, null, 2)}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiAccordion>
  );
};
