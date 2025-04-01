/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EntityGroupAccordion } from '.';

describe('EntityGroupAccordion', () => {
  it('renders with correct values', () => {
    const props = {
      groups: [
        {
          count: 5999,
          'entity.type': 'built_in_hosts_from_ecs_data',
          label: 'Hosts',
        },
        {
          count: 2001,
          'entity.type': 'built_in_services_from_ecs_data',
          label: 'Services',
        },
      ],
    };
    render(
      <EntityGroupAccordion
        groupValue={props.groups[0]['entity.type']}
        groupCount={props.groups[0].count}
        groupLabel={props.groups[0].label}
      />
    );
    expect(screen.getByText(props.groups[0].label)).toBeInTheDocument();
    const container = screen.getByTestId(
      'entityCountBadge_entityType_built_in_hosts_from_ecs_data'
    );
    expect(within(container).getByText('Entities:')).toBeInTheDocument();
    expect(within(container).getByText(props.groups[0].count)).toBeInTheDocument();
  });
});
