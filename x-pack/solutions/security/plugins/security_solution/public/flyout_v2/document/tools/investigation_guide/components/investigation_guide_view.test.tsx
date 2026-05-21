/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { InvestigationGuideView } from './investigation_guide_view';

const defaultProps = {
  hit: buildDataTableRecord({
    _index: 'index',
    _id: 'id',
    fields: {},
  } as unknown as EsHitRecord),
  investigationGuide: 'test note',
};

describe('Investigation guide view', () => {
  it('should render full investigation guide by default', () => {
    const { getByTestId } = render(<InvestigationGuideView {...defaultProps} />);
    expect(getByTestId('investigation-guide-full-view')).toHaveTextContent('test note');
  });
});
