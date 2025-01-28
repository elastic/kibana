/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EngineStatusHeader } from './engine_status_header';
import { capitalize } from 'lodash/fp';
import { EntityType } from '../../../../../../../common/entity_analytics/types';
import { TestProviders } from '../../../../../../common/mock';

describe('EngineStatusHeader', () => {
  it('renders the title with the capitalized entity type', () => {
    const { getByText } = render(<EngineStatusHeader entityType={EntityType.host} />, {
      wrapper: TestProviders,
    });
    expect(getByText(`${capitalize(EntityType.host)} Store`)).toBeInTheDocument();
  });

  it('renders the action button if provided', () => {
    const actionButton = <button type="button">{'Click me'}</button>;
    const { getByText } = render(
      <EngineStatusHeader entityType={EntityType.host} actionButton={actionButton} />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByText('Click me')).toBeInTheDocument();
  });
});
