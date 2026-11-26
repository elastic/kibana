/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { InfoStrip } from './info_strip';

describe('InfoStrip', () => {
  it('turns Enter on a clickable cell into a click so click-based tracking sees it', () => {
    const onClick = jest.fn();
    const onDocumentClick = jest.fn();
    document.addEventListener('click', onDocumentClick);
    render(<InfoStrip items={[{ title: 'Runs', value: '3', onClick }]} />);

    fireEvent.keyDown(screen.getByTestId('automationInfoRuns'), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDocumentClick).toHaveBeenCalledTimes(1);
    document.removeEventListener('click', onDocumentClick);
  });
});
