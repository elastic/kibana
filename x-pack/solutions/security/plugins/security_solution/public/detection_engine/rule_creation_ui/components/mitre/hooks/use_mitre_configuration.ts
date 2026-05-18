/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { camelCase } from 'lodash/fp';
import { useQuery } from '@kbn/react-query';
import type {
  MitreEntity,
  MitreSubtechnique as ManagedSubtechnique,
  MitreTactic as ManagedTactic,
  MitreTechnique as ManagedTechnique,
} from '@kbn/security-mitre-attack-common';
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../../../common/detection_engine/mitre/types';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { fetchSubtechniques, fetchTactics, fetchTechniques } from '../api/api';

interface UseMitreConfigurationResult {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubTechnique[];
  isLoading: boolean;
}

const FRAMEWORK = 'enterprise';
const QUERY_KEY_BASE = ['security_solution', 'mitre', FRAMEWORK] as const;

const formatLabel = (name: string, id: string) => `${name} (${id})`;

const adaptTactic = (entity: ManagedTactic): MitreTactic => ({
  id: entity.id,
  name: entity.name,
  reference: entity.reference,
  value: camelCase(entity.name),
  label: formatLabel(entity.name, entity.id),
});

const adaptTechnique = (entity: ManagedTechnique): MitreTechnique => ({
  id: entity.id,
  name: entity.name,
  reference: entity.reference,
  value: camelCase(entity.name),
  label: formatLabel(entity.name, entity.id),
  tactics: entity.tactics,
});

const adaptSubtechnique = (entity: ManagedSubtechnique): MitreSubTechnique => ({
  id: entity.id,
  name: entity.name,
  reference: entity.reference,
  value: camelCase(entity.name),
  label: formatLabel(entity.name, entity.id),
  tactics: entity.tactics,
  techniqueId: entity.techniqueId,
});

const useManagedMitreConfiguration = (enabled: boolean): UseMitreConfigurationResult => {
  const tacticsQuery = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'tactics'],
    queryFn: ({ signal }) => fetchTactics(FRAMEWORK, signal),
    enabled,
    staleTime: Infinity,
  });
  const techniquesQuery = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'techniques'],
    queryFn: ({ signal }) => fetchTechniques(FRAMEWORK, signal),
    enabled,
    staleTime: Infinity,
  });
  const subtechniquesQuery = useQuery({
    queryKey: [...QUERY_KEY_BASE, 'subtechniques'],
    queryFn: ({ signal }) => fetchSubtechniques(FRAMEWORK, signal),
    enabled,
    staleTime: Infinity,
  });

  const tactics = ((tacticsQuery.data ?? []) as MitreEntity[])
    .filter((e): e is ManagedTactic => e.type === 'tactic')
    .map(adaptTactic);
  const techniques = ((techniquesQuery.data ?? []) as MitreEntity[])
    .filter((e): e is ManagedTechnique => e.type === 'technique')
    .map(adaptTechnique);
  const subtechniques = ((subtechniquesQuery.data ?? []) as MitreEntity[])
    .filter((e): e is ManagedSubtechnique => e.type === 'subtechnique')
    .map(adaptSubtechnique);

  return {
    tactics,
    techniques,
    subtechniques,
    isLoading: tacticsQuery.isLoading || techniquesQuery.isLoading || subtechniquesQuery.isLoading,
  };
};

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
};

const useLegacyMitreConfiguration = (enabled: boolean): UseMitreConfigurationResult => {
  const [tactics, setTactics] = useState<MitreTactic[]>([]);
  const [techniques, setTechniques] = useState<MitreTechnique[]>([]);
  const [subtechniques, setSubtechniques] = useState<MitreSubTechnique[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    lazyMitreConfiguration().then((mitreConfig) => {
      if (cancelled) return;
      setTactics(mitreConfig.tactics);
      setTechniques(mitreConfig.techniques);
      setSubtechniques(mitreConfig.subtechniques);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { tactics, techniques, subtechniques, isLoading };
};

/**
 * Returns the MITRE ATT&CK tactics, techniques, and subtechniques used to
 * populate the rule create form's MITRE selectors. When the
 * `managedMitreSourceEnabled` experimental feature is enabled, this fetches
 * from the managed `/internal/mitre/*` API. Otherwise it falls back to the
 * legacy lazy-loaded TS blob in `common/detection_engine/mitre`.
 */
export const useMitreConfiguration = (): UseMitreConfigurationResult => {
  const managedEnabled = useIsExperimentalFeatureEnabled('managedMitreSourceEnabled');

  const managed = useManagedMitreConfiguration(managedEnabled);
  const legacy = useLegacyMitreConfiguration(!managedEnabled);
  console.log('isUsingManaged: ', managedEnabled);
  return managedEnabled ? managed : legacy;
};
