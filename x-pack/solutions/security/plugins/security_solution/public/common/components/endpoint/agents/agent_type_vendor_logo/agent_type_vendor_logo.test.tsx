/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../mock/endpoint';
import React from 'react';
import type { AgentTypeVendorLogoProps } from './agent_type_vendor_logo';
import { AgentTypeVendorLogo } from './agent_type_vendor_logo';
import { waitFor } from '@testing-library/react';
import { getAgentTypeName } from '../../../../translations';

describe('AgentTypeVendorLogo component', () => {
  let props: AgentTypeVendorLogoProps;
  let render: () => ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    props = { agentType: 'endpoint', 'data-test-subj': 'test' };

    render = () => {
      return mockedContext.render(<AgentTypeVendorLogo {...props} />);
    };
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)('should display logo for: %s', async (agentType) => {
    props.agentType = agentType;
    const { getByTitle } = render();

    await waitFor(() => {
      expect(getByTitle(getAgentTypeName(agentType)));
    });
  });
});
