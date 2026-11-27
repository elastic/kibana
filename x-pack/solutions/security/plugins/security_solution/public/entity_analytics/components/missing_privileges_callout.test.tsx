/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ENGINE_DESCRIPTOR_CREATE_PRIVILEGE } from '@kbn/entity-store/common';
import { TestProviders } from '../../common/mock';
import { MissingPrivilegesCallout } from './missing_privileges_callout';

const renderCallout = (kibana: Record<string, boolean>) =>
  render(
    <TestProviders>
      <MissingPrivilegesCallout
        title="Insufficient privileges"
        privileges={{
          has_all_required: false,
          privileges: { elasticsearch: {}, kibana },
        }}
      />
    </TestProviders>
  );

describe('MissingPrivilegesCallout', () => {
  it('names the Kibana feature and level for the engine descriptor privilege, not the internal action', () => {
    renderCallout({ [ENGINE_DESCRIPTOR_CREATE_PRIVILEGE]: false });

    expect(screen.getByText('Security: All')).toBeInTheDocument();
    expect(screen.queryByText(ENGINE_DESCRIPTOR_CREATE_PRIVILEGE)).not.toBeInTheDocument();
  });

  it('shows Kibana privileges without a known label as they are', () => {
    renderCallout({ 'ui:ml/canGetJobs': false });

    expect(screen.getByText('ui:ml/canGetJobs')).toBeInTheDocument();
  });
});
