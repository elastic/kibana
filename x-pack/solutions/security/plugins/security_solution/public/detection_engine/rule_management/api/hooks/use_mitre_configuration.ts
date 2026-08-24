/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase, kebabCase } from 'lodash';
import { useQuery } from '@kbn/react-query';
import { useKibana, KibanaServices } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  MitreTactic,
  MitreTechnique,
  MitreSubTechnique,
} from '../../../../../common/detection_engine/mitre/types';

/**
 * Path for the MITRE entities endpoint.
 * Source of truth: MITRE_ENTITIES_URL in @kbn/mitre-attack-plugin/common/constants.
 */
const MITRE_ENTITIES_PATH = '/internal/mitre/entities';

const MITRE_CONFIGURATION_QUERY_KEY = ['GET', MITRE_ENTITIES_PATH, 'mitre-configuration'];

// Minimal inline types for the managed source API response (avoids importing from mitre_attack common)
interface ManagedMitreEntityBase {
  type: string;
  id: string;
  name: string;
  reference: string;
  tactic_ids?: string[];
  position?: number;
  technique_id?: string;
}

interface ManagedMitreTactic extends ManagedMitreEntityBase {
  type: 'tactic';
  position: number;
}

interface ManagedMitreTechnique extends ManagedMitreEntityBase {
  type: 'technique';
  tactic_ids: string[];
}

interface ManagedMitreSubtechnique extends ManagedMitreEntityBase {
  type: 'subtechnique';
  tactic_ids: string[];
  technique_id: string;
}

type ManagedMitreEntity = ManagedMitreTactic | ManagedMitreTechnique | ManagedMitreSubtechnique;

interface ManagedMitreResponse {
  framework: string;
  framework_version: string;
  entities: ManagedMitreEntity[];
}

export interface MitreConfigData {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubTechnique[];
}

/**
 * Adapts the managed-source API response (new snake_case schema) into the legacy
 * shapes expected by the security_solution UI (MitreTactic / MitreTechnique / MitreSubTechnique).
 *
 * Adapter rules:
 *   value  → camelCase(name)                               (e.g. "Initial Access" → "initialAccess")
 *   label  → `${name} (${id})`                            (POC: not i18n-translated)
 *   tactic.tactics (for techniques/subtechniques) → tactic_ids.map(taId → kebabCase(tactic.name))
 *   subtechnique.techniqueId → technique_id
 *   tactics sorted ascending by position
 */
export const adaptMitreEntities = (entities: ManagedMitreEntity[]): MitreConfigData => {
  const rawTactics = entities.filter((e): e is ManagedMitreTactic => e.type === 'tactic');
  const rawTechniques = entities.filter((e): e is ManagedMitreTechnique => e.type === 'technique');
  const rawSubtechniques = entities.filter(
    (e): e is ManagedMitreSubtechnique => e.type === 'subtechnique'
  );

  // Sort tactics ascending by position
  const sortedRawTactics = [...rawTactics].sort((a, b) => a.position - b.position);

  // Build tactic id → kebab-case name map (used for technique.tactics field)
  const tacticIdToKebabName = new Map<string, string>();
  for (const tactic of sortedRawTactics) {
    tacticIdToKebabName.set(tactic.id, kebabCase(tactic.name));
  }

  const tactics: MitreTactic[] = sortedRawTactics.map((t) => ({
    id: t.id,
    name: t.name,
    reference: t.reference,
    value: camelCase(t.name),
    // POC: label is not i18n-translated; in production this would use i18n.translate
    label: `${t.name} (${t.id})`,
  }));

  const techniques: MitreTechnique[] = rawTechniques.map((t) => ({
    id: t.id,
    name: t.name,
    reference: t.reference,
    value: camelCase(t.name),
    label: `${t.name} (${t.id})`,
    tactics: t.tactic_ids.map((taId) => tacticIdToKebabName.get(taId) ?? kebabCase(taId)),
  }));

  const subtechniques: MitreSubTechnique[] = rawSubtechniques.map((t) => ({
    id: t.id,
    name: t.name,
    reference: t.reference,
    value: camelCase(t.name),
    label: `${t.name} (${t.id})`,
    tactics: t.tactic_ids.map((taId) => tacticIdToKebabName.get(taId) ?? kebabCase(taId)),
    techniqueId: t.technique_id,
  }));

  return { tactics, techniques, subtechniques };
};

/**
 * Returns the MITRE ATT&CK configuration (tactics, techniques, subtechniques) in the
 * legacy UI shapes used throughout security_solution.
 *
 * When `mitreAttack.isManagedSourceEnabled` is true, fetches live data from the
 * managed saved-objects API and adapts the response. Otherwise falls back to the
 * statically generated blob (lazy-loaded to keep the initial bundle small).
 */
export const useMitreConfiguration = () => {
  const { services } = useKibana();
  const { addError } = useAppToasts();
  const isManagedSourceEnabled = services.mitreAttack?.isManagedSourceEnabled ?? false;

  const { data, isLoading } = useQuery<MitreConfigData>(
    MITRE_CONFIGURATION_QUERY_KEY,
    async () => {
      if (isManagedSourceEnabled) {
        const response = await KibanaServices.get().http.fetch<ManagedMitreResponse>(
          MITRE_ENTITIES_PATH
        );
        return adaptMitreEntities(response.entities);
      }

      // Legacy path: lazy-load the static blob
      const mitreConfig = await import(
        /* webpackChunkName: "lazy_mitre_configuration" */
        '../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
      );
      return {
        tactics: mitreConfig.tactics,
        techniques: mitreConfig.techniques,
        subtechniques: mitreConfig.subtechniques,
      };
    },
    {
      staleTime: Infinity,
      onError: (error) => {
        addError(error, { title: 'Failed to load MITRE ATT&CK configuration' });
      },
    }
  );

  return {
    mitreConfig: data ?? null,
    isLoading,
  };
};
