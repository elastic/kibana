/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MissingPrivilegesCallout } from './missing_privileges_callout';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { TestProviders } from '../../../../common/mock';

const missingEntityEnginePrivileges: EntityAnalyticsPrivileges = {
  has_all_required: false,
  privileges: {
    elasticsearch: {
      cluster: {
        manage_enrich: false,
      },
      index: { 'logs-*': { read: false, view_index_metadata: false } },
    },
    kibana: {
      'saved_object:entity-engine-status/all': false,
    },
  },
};

const renderWithTestProviders = (children: React.ReactNode) => {
  return render(<TestProviders>{children}</TestProviders>);
};

describe('MissingPrivilegesCallout', () => {
  it('Should render missing privileges', () => {
    renderWithTestProviders(
      <MissingPrivilegesCallout privileges={missingEntityEnginePrivileges} />
    );

    expect(screen.getByText(/missing elasticsearch index privileges/i)).toBeInTheDocument();
    expect(screen.getByTestId('missing-entity-store-privileges-es-index-logs-*')).toHaveTextContent(
      /missing read, view_index_metadata privileges for the logs-\* index/i
    );

    expect(screen.getByTestId('missing-entity-store-privileges-es-cluster')).toHaveTextContent(
      /manage_enrich/i
    );

    expect(screen.getByTestId('missing-entity-store-privileges-kibana-feature')).toHaveTextContent(
      /Missing privilege for the saved_object:entity-engine-status\/all feature/i
    );
  });
  it('Should render missing privileges with line clamp view by default', () => {
    renderWithTestProviders(
      <MissingPrivilegesCallout privileges={missingEntityEnginePrivileges} />
    );

    expect(screen.getByTestId('line-clamp-view')).toBeInTheDocument();
  });
  it('Should render missing privileges with full view when showFullView is true', () => {
    renderWithTestProviders(
      <MissingPrivilegesCallout privileges={missingEntityEnginePrivileges} showFullView />
    );

    expect(screen.getByTestId('show-full-view')).toBeInTheDocument();
  });
});
