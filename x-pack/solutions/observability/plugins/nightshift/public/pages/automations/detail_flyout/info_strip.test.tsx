/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { InfoStrip } from './info_strip';

describe('InfoStrip', () => {
  it('turns Enter on a tagged cell into a click that carries the tracking attributes', () => {
    const onClick = jest.fn();
    const clickedTargets: EventTarget[] = [];
    const listener = (event: MouseEvent) => event.target && clickedTargets.push(event.target);
    document.addEventListener('click', listener);
    render(
      <InfoStrip
        items={[
          {
            title: 'Runs',
            value: '3',
            onClick,
            ebt: {
              action: NIGHTSHIFT_EBT_ACTIONS.VIEW_AUTOMATION_RUNS,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_DETAIL_FLYOUT,
            },
          },
        ]}
      />
    );

    fireEvent.keyDown(screen.getByTestId('automationInfoRuns'), { key: 'Enter' });
    document.removeEventListener('click', listener);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(clickedTargets).toHaveLength(1);
    const tagged = (clickedTargets[0] as Element).closest('[data-ebt-action]');
    expect(tagged).toHaveAttribute('data-ebt-action', NIGHTSHIFT_EBT_ACTIONS.VIEW_AUTOMATION_RUNS);
    expect(tagged).toHaveAttribute(
      'data-ebt-element',
      NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_DETAIL_FLYOUT
    );
  });
});
