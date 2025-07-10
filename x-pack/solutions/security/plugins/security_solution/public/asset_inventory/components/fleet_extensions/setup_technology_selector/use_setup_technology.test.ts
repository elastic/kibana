/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import type { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';

import { useSetupTechnology } from './use_setup_technology';
import { CLOUDBEAT_AWS } from '../aws_credentials_form/constants';
import { CLOUDBEAT_GCP } from '../gcp_credentials_form/constants';
import { CLOUDBEAT_AZURE } from '../azure_credentials_form/constants';

describe('useSetupTechnology', () => {
  describe('create page flow', () => {
    it('initializes with AGENT_BASED technology', () => {
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: { type: 'cloudbeat/no-agentless-support' } as NewPackagePolicyInput,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENT-BASED when agentless is available and AWS cloud', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() => useSetupTechnology({ input, isAgentlessEnabled: true }));
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENT-BASED when agentless is available and GCP cloud', () => {
      const input = { type: CLOUDBEAT_GCP } as NewPackagePolicyInput;
      const { result } = renderHook(() => useSetupTechnology({ input, isAgentlessEnabled: true }));
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENT-BASED when agentless is available and Azure cloud', () => {
      const input = { type: CLOUDBEAT_AZURE } as NewPackagePolicyInput;
      const { result } = renderHook(() => useSetupTechnology({ input, isAgentlessEnabled: true }));
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENT_BASED when isAgentlessEnabled is false', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() => useSetupTechnology({ input, isAgentlessEnabled: false }));
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('calls handleSetupTechnologyChange when setupTechnology changes', () => {
      const inputPackage = {
        type: 'someType',
        policy_template: 'somePolicyTemplate',
      } as NewPackagePolicyInput;
      const handleSetupTechnologyChangeMock = jest.fn();
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: inputPackage,
          handleSetupTechnologyChange: handleSetupTechnologyChangeMock,
        })
      );

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);

      act(() => {
        result.current.updateSetupTechnology(SetupTechnology.AGENTLESS);
      });

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
      expect(handleSetupTechnologyChangeMock).toHaveBeenCalledWith(SetupTechnology.AGENTLESS);
    });
  });

  describe('edit page flow', () => {
    it('initializes with AGENT_BASED technology', () => {
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: { type: 'cloudbeat/no-agentless-support' } as NewPackagePolicyInput,
          isEditPage: true,
          isAgentlessEnabled: false,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('initializes with agentless when is in edit mode and is agentless selected', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({
          input,
          isAgentlessEnabled: true,
          isEditPage: true,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('should not call handleSetupTechnologyChange when setupTechnology changes', () => {
      const handleSetupTechnologyChangeMock = jest.fn();
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({
          input,
          handleSetupTechnologyChange: handleSetupTechnologyChangeMock,
        })
      );

      act(() => {
        result.current.setSetupTechnology(SetupTechnology.AGENT_BASED);
      });

      expect(handleSetupTechnologyChangeMock).not.toHaveBeenCalled();
    });

    it('should not update setupTechnology when agentlessPolicyId becomes available', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const { result, rerender } = renderHook(() =>
        useSetupTechnology({
          input,
        })
      );

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);

      act(() => {
        rerender({
          input,
          agentlessPolicy,
        });
      });

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });
  });
});
