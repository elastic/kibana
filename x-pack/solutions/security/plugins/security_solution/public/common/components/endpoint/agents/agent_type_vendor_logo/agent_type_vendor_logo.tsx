/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { getAgentTypeName } from '../../../../translations';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';

const fetchSentinelOneLogoSvg = (): Promise<string> =>
  import('./images/sentinelone_logo.svg').then((response) => response.default);
const fetchCrowdstrikeLogoSvg = (): Promise<string> =>
  import('./images/crowdstrike_logo.svg').then((response) => response.default);

export interface AgentTypeVendorLogoProps
  extends Pick<EuiIconProps, 'size' | 'data-test-subj' | 'color'> {
  agentType: ResponseActionAgentType;
}

export const AgentTypeVendorLogo = memo<AgentTypeVendorLogoProps>(
  ({ agentType, ...otherIconProps }) => {
    const isMounted = useIsMounted();
    const [iconType, setIconType] = useState<EuiIconProps['type']>('empty');

    useEffect(() => {
      if (isMounted()) {
        const setSvgToState = (svgContent: string) => {
          if (isMounted()) {
            setIconType(svgContent);
          }
        };

        switch (agentType) {
          case 'endpoint':
            setIconType('logoSecurity');
            break;

          case 'sentinel_one':
            fetchSentinelOneLogoSvg().then(setSvgToState);
            break;

          case 'crowdstrike':
            fetchCrowdstrikeLogoSvg().then(setSvgToState);
            break;
        }
      }
    }, [agentType, isMounted]);

    return (
      <EuiIcon
        type={iconType}
        title={iconType === 'empty' ? '' : getAgentTypeName(agentType)}
        size="m"
        {...otherIconProps}
      />
    );
  }
);
AgentTypeVendorLogo.displayName = 'AgentTypeVendorLogo';
