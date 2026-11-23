/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useGetPreviewData } from '../../../hooks/use_get_preview_data';
import { CUSTOM_KQL_DEFAULT_VALUES, SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateSLOForm } from '../types';
import { useDebouncedGetPreviewData } from './use_preview';

jest.mock('../../../hooks/use_get_preview_data');

const useGetPreviewDataMock = jest.mocked(useGetPreviewData);

const range = { from: new Date('2026-11-03T00:00:00Z'), to: new Date('2026-11-04T00:00:00Z') };

const renderCounts = { parent: 0, host: 0 };

function PreviewHost() {
  renderCounts.host++;
  useDebouncedGetPreviewData({ isIndicatorValid: true, range });
  return null;
}

function SetIndexOnMount() {
  const { setValue } = useFormContext<CreateSLOForm>();
  useEffect(() => {
    setValue('indicator.params.index', 'logs-mount-*');
  }, [setValue]);
  return null;
}

function Harness({
  formRef,
  withMountSetter = false,
}: {
  formRef: { current?: UseFormReturn<CreateSLOForm> };
  withMountSetter?: boolean;
}) {
  renderCounts.parent++;
  const methods = useForm<CreateSLOForm>({
    defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES,
    mode: 'all',
  });
  formRef.current = methods;

  return (
    <FormProvider {...methods}>
      {withMountSetter && <SetIndexOnMount />}
      <PreviewHost />
    </FormProvider>
  );
}

const lastPreviewProps = () => {
  const { calls } = useGetPreviewDataMock.mock;
  return calls[calls.length - 1][0];
};

const distinctIndicators = () =>
  new Set(useGetPreviewDataMock.mock.calls.map(([props]) => props.indicator)).size;

describe('useDebouncedGetPreviewData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useGetPreviewDataMock.mockReset();
    useGetPreviewDataMock.mockReturnValue({
      data: undefined,
      isInitialLoading: false,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
    renderCounts.parent = 0;
    renderCounts.host = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes the latest indicator once the debounce delay has elapsed', () => {
    const formRef: { current?: UseFormReturn<CreateSLOForm> } = {};
    render(<Harness formRef={formRef} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    const initialIndicators = distinctIndicators();

    act(() => {
      ['h', 'ho', 'hos', 'host', 'host.name: a'].forEach((value) => {
        formRef.current?.setValue('indicator.params.good', value);
        jest.advanceTimersByTime(100);
      });
    });

    expect(lastPreviewProps().indicator.params).toEqual(
      expect.objectContaining({ good: CUSTOM_KQL_DEFAULT_VALUES.params.good })
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(lastPreviewProps().indicator.params).toEqual(
      expect.objectContaining({ good: 'host.name: a' })
    );
    expect(distinctIndicators()).toBe(initialIndicators + 1);
  });

  it('keeps the same params when the value goes back to the committed one', () => {
    const formRef: { current?: UseFormReturn<CreateSLOForm> } = {};
    render(<Harness formRef={formRef} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    const committed = lastPreviewProps().indicator;

    act(() => {
      formRef.current?.setValue('indicator.params.good', 'something');
      formRef.current?.setValue('indicator.params.good', '');
      jest.advanceTimersByTime(800);
    });

    expect(lastPreviewProps().indicator).toBe(committed);
  });

  it('does not postpone the commit when an unrelated field changes', () => {
    const formRef: { current?: UseFormReturn<CreateSLOForm> } = {};
    render(<Harness formRef={formRef} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });

    act(() => {
      formRef.current?.setValue('indicator.params.good', 'host.name: a');
      jest.advanceTimersByTime(500);
      formRef.current?.setValue('name', 'My SLO');
      jest.advanceTimersByTime(300);
    });

    expect(lastPreviewProps().indicator.params).toEqual(
      expect.objectContaining({ good: 'host.name: a' })
    );
  });

  it('picks up a value set by a sibling effect during the first mount', () => {
    const formRef: { current?: UseFormReturn<CreateSLOForm> } = {};
    render(<Harness formRef={formRef} withMountSetter />);

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(lastPreviewProps().indicator.params).toEqual(
      expect.objectContaining({ index: 'logs-mount-*' })
    );
  });

  it('does not re-render the form root or the preview host on every change', () => {
    const formRef: { current?: UseFormReturn<CreateSLOForm> } = {};
    render(<Harness formRef={formRef} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    const parentRenders = renderCounts.parent;
    const hostRenders = renderCounts.host;

    act(() => {
      ['a', 'ab', 'abc', 'abcd', 'abcde'].forEach((value) => {
        formRef.current?.setValue('indicator.params.good', value);
        jest.advanceTimersByTime(100);
      });
    });

    expect(renderCounts.parent).toBe(parentRenders);
    expect(renderCounts.host).toBe(hostRenders);

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(renderCounts.parent).toBe(parentRenders);
    expect(renderCounts.host).toBe(hostRenders + 1);
  });
});
