/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { UpsellingProvider } from '../common/components/upselling_provider';
import { CloudDefendPliAuthBlockExtension } from './cloud_defend_pli_auth_block_extension';

const Upsell = () => <div>{'Cloud Protection required'}</div>;

describe('CloudDefendPliAuthBlockExtension', () => {
  it.each([true, false])('renders the creation form only without an upsell (%s)', (blocked) => {
    const upsellingService = new UpsellingService();
    upsellingService.setSections(blocked ? { cloud_defend_integration_installation: Upsell } : {});

    render(
      <UpsellingProvider upsellingService={upsellingService}>
        <CloudDefendPliAuthBlockExtension>
          <button type="button">{'Add integration'}</button>
        </CloudDefendPliAuthBlockExtension>
      </UpsellingProvider>
    );

    if (blocked) {
      expect(screen.getByText('Cloud Protection required')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add integration' })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: 'Add integration' })).toBeInTheDocument();
      expect(screen.queryByText('Cloud Protection required')).not.toBeInTheDocument();
    }
  });
});
