/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
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
