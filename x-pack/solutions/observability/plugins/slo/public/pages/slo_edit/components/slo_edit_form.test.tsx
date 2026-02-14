/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SloEditForm } from './slo_edit_form';

const mockUseSectionFormValidation = jest.fn();
const mockUseShowSections = jest.fn();
const mockObjectiveSection = jest.fn(() => <div data-test-subj="sloEditFormObjectiveSection">objective</div>);

jest.mock('../hooks/use_section_form_validation', () => ({
  useSectionFormValidation: (...args: unknown[]) => mockUseSectionFormValidation(...args),
}));

jest.mock('../hooks/use_show_sections', () => ({
  useShowSections: (...args: unknown[]) => mockUseShowSections(...args),
}));

jest.mock('./slo_edit_form_indicator_section', () => ({
  SloEditFormIndicatorSection: () => <div data-test-subj="sloEditFormIndicatorSection">indicator</div>,
}));

jest.mock('./slo_edit_form_objective_section', () => ({
  SloEditFormObjectiveSection: (props: unknown) => mockObjectiveSection(props),
}));

jest.mock('./slo_edit_form_description_section', () => ({
  SloEditFormDescriptionSection: () => (
    <div data-test-subj="sloEditFormDescriptionSection">description</div>
  ),
}));

jest.mock('./slo_edit_form_footer', () => ({
  SloEditFormFooter: () => <div data-test-subj="sloEditFormFooter">footer</div>,
}));

describe('SloEditForm layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSectionFormValidation.mockReturnValue({
      isIndicatorSectionValid: false,
      isObjectiveSectionValid: false,
      isDescriptionSectionValid: false,
    });
    mockUseShowSections.mockReturnValue({
      showObjectiveSection: false,
      showDescriptionSection: false,
    });
  });

  afterEach(cleanup);

  it('keeps vertical progressive reveal behavior by default', () => {
    render(<SloEditForm />);

    expect(screen.getByTestId('sloEditFormIndicatorSection')).toBeInTheDocument();
    expect(screen.queryByTestId('sloEditFormObjectiveSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sloEditFormDescriptionSection')).not.toBeInTheDocument();
  });

  it('renders only the active horizontal step section', () => {
    render(<SloEditForm formSettings={{ formLayout: 'horizontal' }} />);

    expect(screen.getByTestId('sloFormHorizontalStepper')).toBeInTheDocument();
    expect(screen.getByTestId('sloEditFormIndicatorSection')).toBeInTheDocument();
    expect(screen.queryByTestId('sloEditFormObjectiveSection')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sloEditFormDescriptionSection')).not.toBeInTheDocument();
  });

  it('locks future steps until prerequisites are valid', () => {
    const { rerender } = render(<SloEditForm formSettings={{ formLayout: 'horizontal' }} />);

    fireEvent.click(screen.getByText('Set objectives'));
    expect(screen.queryByTestId('sloEditFormObjectiveSection')).not.toBeInTheDocument();

    mockUseSectionFormValidation.mockReturnValue({
      isIndicatorSectionValid: true,
      isObjectiveSectionValid: false,
      isDescriptionSectionValid: false,
    });
    rerender(<SloEditForm formSettings={{ formLayout: 'horizontal' }} />);

    fireEvent.click(screen.getByText('Set objectives'));
    expect(screen.getByTestId('sloEditFormObjectiveSection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Describe SLO'));
    expect(screen.queryByTestId('sloEditFormDescriptionSection')).not.toBeInTheDocument();
  });

  it('allows going back to previous steps in horizontal mode', () => {
    mockUseSectionFormValidation.mockReturnValue({
      isIndicatorSectionValid: true,
      isObjectiveSectionValid: true,
      isDescriptionSectionValid: false,
    });

    render(<SloEditForm formSettings={{ formLayout: 'horizontal' }} />);

    fireEvent.click(screen.getByText('Set objectives'));
    expect(screen.getByTestId('sloEditFormObjectiveSection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Define SLI'));
    expect(screen.getByTestId('sloEditFormIndicatorSection')).toBeInTheDocument();
    expect(screen.queryByTestId('sloEditFormObjectiveSection')).not.toBeInTheDocument();
  });

  it('passes horizontal layout to objective section', () => {
    mockUseSectionFormValidation.mockReturnValue({
      isIndicatorSectionValid: true,
      isObjectiveSectionValid: false,
      isDescriptionSectionValid: false,
    });

    render(<SloEditForm formSettings={{ formLayout: 'horizontal' }} />);

    fireEvent.click(screen.getByText('Set objectives'));

    const latestObjectiveCall = mockObjectiveSection.mock.calls.at(-1)?.[0];
    expect(latestObjectiveCall).toEqual(expect.objectContaining({ isHorizontalLayout: true }));
  });
});
