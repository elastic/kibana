/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import CreateSLOFormFlyout from './create_slo_form_flyout';

const mockSloEditForm = jest.fn(() => <div data-test-subj="sloEditFormMock" />);
const mockTransform = jest.fn((value) => value);

jest.mock('../components/slo_edit_form', () => ({
  SloEditForm: (props: unknown) => mockSloEditForm(props),
}));

jest.mock('../helpers/process_slo_form_values', () => ({
  transformPartialSLODataToFormState: (value: unknown) => mockTransform(value),
}));

describe('CreateSLOFormFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forces horizontal form layout', () => {
    render(
      <CreateSLOFormFlyout
        onClose={jest.fn()}
        initialValues={{}}
        formSettings={{ formLayout: 'vertical', isEditMode: false }}
      />
    );

    expect(mockSloEditForm).toHaveBeenCalled();
    const props = mockSloEditForm.mock.calls[0][0] as { formSettings: { formLayout: string } };
    expect(props.formSettings.formLayout).toBe('horizontal');
  });
});
