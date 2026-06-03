/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useForm, FormProvider } from 'react-hook-form';
import { render } from '../../../utils/test_helper';
import { useFetchSloDefinitionsWithRemote } from '../../../hooks/use_fetch_slo_definitions_with_remote';
import { useFetchSloInstances } from '../../../hooks/use_fetch_slo_instances';
import { CompositeSloMembersSection } from './composite_slo_members_section';
import type { CreateCompositeSLOForm } from '../types';

jest.mock('../../../hooks/use_fetch_slo_definitions_with_remote');
jest.mock('../../../hooks/use_fetch_slo_instances');

const useFetchSloDefinitionsWithRemoteMock = useFetchSloDefinitionsWithRemote as jest.Mock;
const useFetchSloInstancesMock = useFetchSloInstances as jest.Mock;

const defaultDefinitions = {
  results: [{ id: 'slo-1', name: 'SLO One', groupBy: 'env' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
    data: defaultDefinitions,
    isLoading: false,
  });
  useFetchSloInstancesMock.mockReturnValue({ data: undefined, isLoading: false });
});

describe('CompositeSloMembersSection', () => {
  describe('instanceId reset when groupBy is removed from member SLO', () => {
    it('resets a stale instanceId to ALL_VALUE when the member SLO is no longer grouped', async () => {
      // Simulates: composite stored instanceId="production", but the member SLO definition
      // now returns groupBy=ALL_VALUE (groupBy was removed after composite creation).
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: ALL_VALUE, // current groupBy from member SLO definition (no longer grouped)
            instanceId: 'production', // stale instanceId from the composite
            weight: 1,
          },
        ],
      };

      let formValues: CreateCompositeSLOForm | undefined;

      function WrapperWithCapture() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        formValues = methods.watch();
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      render(<WrapperWithCapture />);

      await waitFor(() => {
        expect(formValues?.members[0].instanceId).toBe(ALL_VALUE);
      });
    });

    it('does not reset instanceId when grouped member already has ALL_VALUE (intentional)', async () => {
      // ALL_VALUE is now a valid instanceId for grouped SLOs. A member loaded with
      // groupBy="env" and instanceId=ALL_VALUE should not be touched.
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: 'env',
            instanceId: ALL_VALUE,
            weight: 1,
          },
        ],
      };

      useFetchSloInstancesMock.mockReturnValue({
        data: { results: [{ instanceId: 'production' }, { instanceId: 'staging' }] },
        isLoading: false,
      });

      let formValues: CreateCompositeSLOForm | undefined;

      function WrapperWithCapture() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        formValues = methods.watch();
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      render(<WrapperWithCapture />);

      await waitFor(() => {
        expect(formValues?.members).toHaveLength(1);
        expect(formValues?.members[0].instanceId).toBe(ALL_VALUE);
      });
    });

    it('renders the instance combo box with an editable input separate from the selected pill', async () => {
      // Regression for: with `singleSelection={{ asPlainText: true }}` the combo box's
      // input mirrored the selected option's label ("All instances"), so the user could
      // not backspace it to type a search query. The non-plain-text mode shows the
      // selected option as a pill and leaves the search input empty/editable.
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: 'env',
            instanceId: ALL_VALUE,
            weight: 1,
          },
        ],
      };

      useFetchSloInstancesMock.mockReturnValue({
        data: { results: [{ instanceId: 'production' }, { instanceId: 'staging' }] },
        isLoading: false,
      });

      function Wrapper() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      render(<Wrapper />);

      const combo = await screen.findByTestId('compositeSloMemberInstanceComboBox-0');
      const input = combo.querySelector('input[role="combobox"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      // In plain-text mode EUI sets the input value to the selected label. The fix
      // switches to non-plain-text so the input starts empty and the selection is
      // shown as a separate pill.
      expect(input.value).toBe('');
      expect(combo.textContent).toContain('All instances');

      fireEvent.change(input, { target: { value: 'prod' } });
      await waitFor(() => {
        expect(input.value).toBe('prod');
      });
    });

    it('forwards the typed instance search to useFetchSloInstances after debounce', async () => {
      // Regression for: the instance combo box did not wire `onSearchChange`, so user
      // input never reached the server-side `search` filter. Combined with the
      // hard-coded size=100 page, instances outside the first page were unreachable.
      jest.useFakeTimers();
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: 'env',
            instanceId: ALL_VALUE,
            weight: 1,
          },
        ],
      };

      useFetchSloInstancesMock.mockReturnValue({
        data: { results: [{ instanceId: 'production' }, { instanceId: 'staging' }] },
        isLoading: false,
      });

      function Wrapper() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      try {
        render(<Wrapper />);

        const combo = await screen.findByTestId('compositeSloMemberInstanceComboBox-0');
        const input = combo.querySelector('input[role="combobox"]') as HTMLInputElement;
        expect(input).toBeTruthy();

        // Before typing: hook called with sloId only, no search.
        expect(useFetchSloInstancesMock).toHaveBeenCalledWith(
          expect.objectContaining({ sloId: 'slo-1', search: undefined, size: 100, enabled: true })
        );

        fireEvent.change(input, { target: { value: 'prod' } });

        // Search is debounced — flush timers.
        jest.advanceTimersByTime(400);

        await waitFor(() => {
          expect(useFetchSloInstancesMock).toHaveBeenCalledWith(
            expect.objectContaining({ sloId: 'slo-1', search: 'prod', size: 100, enabled: true })
          );
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('keeps the selected instance pill visible when it is not in the current fetch batch', async () => {
      // Regression for: after selecting an instance found via search, the search
      // resets and the next fetch (first 100 instances) does not contain the picked
      // one. Without pinning the selection into options, the combo box rendered no
      // pill and the selection looked like it disappeared.
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: 'env',
            instanceId: 'web-42',
            weight: 1,
          },
        ],
      };

      // Fetched batch does NOT include 'web-42'.
      useFetchSloInstancesMock.mockReturnValue({
        data: { results: [{ instanceId: 'production' }, { instanceId: 'staging' }] },
        isLoading: false,
      });

      function Wrapper() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      render(<Wrapper />);

      const combo = await screen.findByTestId('compositeSloMemberInstanceComboBox-0');
      expect(combo.textContent).toContain('web-42');
    });

    it('does not reset instanceId when the member SLO is still grouped', async () => {
      const defaultValues: Partial<CreateCompositeSLOForm> = {
        members: [
          {
            sloId: 'slo-1',
            sloName: 'SLO One',
            groupBy: 'env', // still grouped
            instanceId: 'production',
            weight: 1,
          },
        ],
      };

      useFetchSloInstancesMock.mockReturnValue({
        data: { results: [{ instanceId: 'production' }, { instanceId: 'staging' }] },
        isLoading: false,
      });

      let formValues: CreateCompositeSLOForm | undefined;

      function WrapperWithCapture() {
        const methods = useForm<CreateCompositeSLOForm>({ defaultValues });
        formValues = methods.watch();
        return (
          <FormProvider {...methods}>
            <CompositeSloMembersSection />
          </FormProvider>
        );
      }

      render(<WrapperWithCapture />);

      await waitFor(() => {
        expect(formValues?.members[0].instanceId).toBe('production');
      });
    });
  });
});
