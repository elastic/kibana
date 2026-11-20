/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetchSloInspect } from '../../../../../hooks/use_fetch_slo_inspect';
import { core, render } from '../../../../../utils/test_helper';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../../../constants';
import type { CreateSLOForm } from '../../../types';
import { SLOInspect } from './slo_inspect';

jest.mock('../../../../../hooks/use_fetch_slo_inspect');
jest.mock('../../../../../hooks/use_kibana', () => {
  const services = {
    application: { navigateToUrl: () => {} },
    share: { url: { locators: { get: () => undefined } } },
    http: { basePath: { prepend: (path: string) => path } },
  };
  return { useKibana: () => ({ services }) };
});

const useFetchSloInspectMock = jest.mocked(useFetchSloInspect);

function Wrapper() {
  const methods = useForm<CreateSLOForm>({
    defaultValues: { ...SLO_EDIT_FORM_DEFAULT_VALUES, name: 'My SLO' },
    mode: 'all',
  });

  return (
    <FormProvider {...methods}>
      <input data-test-subj="nameInput" {...methods.register('name', { required: true })} />
      <SLOInspect disabled={false} />
    </FormProvider>
  );
}

const openFlyout = () =>
  fireEvent.click(screen.getByTestId('syntheticsMonitorInspectShowFlyoutExampleButton'));

const closeFlyout = () =>
  fireEvent.click(screen.getByTestId('syntheticsMonitorInspectCloseButton'));

const setName = (value: string) =>
  fireEvent.change(screen.getByTestId('nameInput'), { target: { value } });

// Lets the async click handler settle: form validation resolves through microtasks only.
const flushPendingValidation = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

const lastInspectCall = () => {
  const { calls } = useFetchSloInspectMock.mock;
  return calls[calls.length - 1];
};

describe('<SLOInspect />', () => {
  beforeEach(() => {
    useFetchSloInspectMock.mockReset();
    useFetchSloInspectMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  });

  it('does not build the inspect input before the button is clicked', () => {
    render(<Wrapper />);

    expect(lastInspectCall()).toEqual([undefined, false]);
  });

  it('does not open the flyout nor inspect when the form is invalid', async () => {
    render(<Wrapper />);

    setName('');
    openFlyout();

    await flushPendingValidation();

    expect(screen.queryByTestId('syntheticsMonitorInspectCloseButton')).not.toBeInTheDocument();
    expect(lastInspectCall()).toEqual([undefined, false]);
  });

  it('inspects the transformed form values when the form is valid', async () => {
    render(<Wrapper />);

    openFlyout();

    await waitFor(() =>
      expect(lastInspectCall()).toEqual([expect.objectContaining({ name: 'My SLO' }), true])
    );
  });

  it('inspects the latest form values when the flyout is reopened', async () => {
    render(<Wrapper />);

    openFlyout();
    await screen.findByTestId('syntheticsMonitorInspectCloseButton');
    closeFlyout();
    await waitFor(() =>
      expect(screen.queryByTestId('syntheticsMonitorInspectCloseButton')).not.toBeInTheDocument()
    );

    setName('Renamed SLO');
    openFlyout();

    await waitFor(() =>
      expect(lastInspectCall()).toEqual([expect.objectContaining({ name: 'Renamed SLO' }), true])
    );
  });

  describe('with the real inspect query', () => {
    const inspectResponse = (name: string) => ({
      slo: { name },
      rollUpTransform: {},
      summaryTransform: {},
      rollUpPipeline: {},
      summaryPipeline: {},
      temporaryDoc: {},
      rollUpTransformCompositeQuery: '',
      summaryTransformCompositeQuery: '',
    });

    const queryResponseText = (text: string) =>
      screen.queryAllByText(
        (_, element) => element?.tagName === 'CODE' && (element.textContent ?? '').includes(text)
      );

    beforeEach(() => {
      const actual = jest.requireActual<
        typeof import('../../../../../hooks/use_fetch_slo_inspect')
      >('../../../../../hooks/use_fetch_slo_inspect');
      useFetchSloInspectMock.mockImplementation(actual.useFetchSloInspect);
      core.http.fetch.mockReset();
    });

    it('does not show the previous response while the edited values are inspected', async () => {
      core.http.fetch
        .mockResolvedValueOnce(inspectResponse('First response'))
        .mockReturnValueOnce(new Promise(() => {}));
      render(<Wrapper />);

      openFlyout();
      await waitFor(() => expect(queryResponseText('First response')).not.toHaveLength(0));
      closeFlyout();
      await waitFor(() =>
        expect(screen.queryByTestId('syntheticsMonitorInspectCloseButton')).not.toBeInTheDocument()
      );

      setName('Renamed SLO');
      openFlyout();
      await screen.findByTestId('syntheticsMonitorInspectCloseButton');
      await waitFor(() => expect(core.http.fetch).toHaveBeenCalledTimes(2));

      expect(queryResponseText('First response')).toHaveLength(0);
    });
  });
});
