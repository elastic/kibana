/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { useMitreConfiguration } from './use_mitre_configuration';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { fetchSubtechniques, fetchTactics, fetchTechniques } from '../api/api';

jest.mock('../../../../../common/hooks/use_experimental_features');
jest.mock('../api/api');

const mockTactic: MitreEntity = {
  type: 'tactic',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'TA0006',
  name: 'Credential Access',
  reference: 'https://attack.mitre.org/tactics/TA0006/',
  description: 'desc',
};

const mockTechnique: MitreEntity = {
  type: 'technique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1078',
  name: 'Valid Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  description: 'desc',
  tactics: ['credential-access', 'persistence'],
};

const mockSubtechnique: MitreEntity = {
  type: 'subtechnique',
  framework: 'enterprise',
  versions: ['ATT&CK-v18.1'],
  id: 'T1078.001',
  name: 'Default Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/001/',
  description: 'desc',
  tactics: ['credential-access'],
  techniqueId: 'T1078',
};

const renderUseMitreConfiguration = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useMitreConfiguration(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

describe('useMitreConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchTactics as jest.Mock).mockResolvedValue([mockTactic]);
    (fetchTechniques as jest.Mock).mockResolvedValue([mockTechnique]);
    (fetchSubtechniques as jest.Mock).mockResolvedValue([mockSubtechnique]);
  });

  describe('when managedMitreSourceEnabled is true', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    });

    it('fetches data from the managed API and adapts to legacy shape', async () => {
      const { result } = renderUseMitreConfiguration();

      await waitFor(() => {
        expect(result.current.tactics).toHaveLength(1);
      });

      expect(result.current.tactics[0]).toEqual({
        id: 'TA0006',
        name: 'Credential Access',
        reference: 'https://attack.mitre.org/tactics/TA0006/',
        value: 'credentialAccess',
        label: 'Credential Access (TA0006)',
      });

      expect(result.current.techniques[0]).toEqual({
        id: 'T1078',
        name: 'Valid Accounts',
        reference: 'https://attack.mitre.org/techniques/T1078/',
        value: 'validAccounts',
        label: 'Valid Accounts (T1078)',
        tactics: ['credential-access', 'persistence'],
      });

      expect(result.current.subtechniques[0]).toEqual({
        id: 'T1078.001',
        name: 'Default Accounts',
        reference: 'https://attack.mitre.org/techniques/T1078/001/',
        value: 'defaultAccounts',
        label: 'Default Accounts (T1078.001)',
        tactics: ['credential-access'],
        techniqueId: 'T1078',
      });

      expect(fetchTactics).toHaveBeenCalledWith('enterprise', expect.anything());
      expect(fetchTechniques).toHaveBeenCalledWith('enterprise', expect.anything());
      expect(fetchSubtechniques).toHaveBeenCalledWith('enterprise', expect.anything());
    });
  });

  describe('when managedMitreSourceEnabled is false', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    });

    it('does not call the managed API', async () => {
      const { result } = renderUseMitreConfiguration();

      await waitFor(() => {
        expect(result.current.tactics.length).toBeGreaterThan(0);
      });

      expect(fetchTactics).not.toHaveBeenCalled();
      expect(fetchTechniques).not.toHaveBeenCalled();
      expect(fetchSubtechniques).not.toHaveBeenCalled();
    });

    it('returns the legacy lazy-loaded MITRE configuration', async () => {
      const { result } = renderUseMitreConfiguration();

      await waitFor(() => {
        expect(result.current.tactics.length).toBeGreaterThan(0);
      });

      const tactic = result.current.tactics[0];
      expect(tactic).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^TA\d{4}$/),
          name: expect.any(String),
          reference: expect.stringContaining('attack.mitre.org/tactics/'),
          value: expect.any(String),
          label: expect.any(String),
        })
      );
    });
  });
});
