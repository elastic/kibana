/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { load as loadYaml } from 'js-yaml';
import type { AtlasYamlDocument } from '../../../rule_management_ui/pages/coverage_overview/atlas_matrix_helpers';
import {
  ATLAS_YAML_URL,
  buildAtlasMatrixFromYaml,
} from '../../../rule_management_ui/pages/coverage_overview/atlas_matrix_helpers';
import type {
  AtlasThreatSubtechniqueOption,
  AtlasThreatTacticOption,
  AtlasThreatTechniqueOption,
} from './types';

const ATLAS_REFERENCE = 'https://atlas.mitre.org/';

const formatLabel = (name: string, id: string): string => `${name} (${id})`;

export interface AtlasThreatOptions {
  tactics: AtlasThreatTacticOption[];
  techniques: AtlasThreatTechniqueOption[];
  subtechniques: AtlasThreatSubtechniqueOption[];
}

const emptyOptions: AtlasThreatOptions = {
  tactics: [],
  techniques: [],
  subtechniques: [],
};

let cachedOptions: AtlasThreatOptions | null = null;
let loadPromise: Promise<AtlasThreatOptions> | null = null;

const buildOptionsFromYaml = async (): Promise<AtlasThreatOptions> => {
  const response = await fetch(ATLAS_YAML_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ATLAS YAML (${response.status})`);
  }

  const yamlText = await response.text();
  const document = loadYaml(yamlText) as AtlasYamlDocument;
  const matrix = buildAtlasMatrixFromYaml(document);

  const tactics: AtlasThreatTacticOption[] = matrix.map((tactic) => ({
    id: tactic.id,
    name: tactic.name,
    reference: ATLAS_REFERENCE,
    value: tactic.id,
    label: formatLabel(tactic.name, tactic.id),
  }));

  const techniques: AtlasThreatTechniqueOption[] = [];
  const subtechniques: AtlasThreatSubtechniqueOption[] = [];
  const techniqueTacticIds = new Map<string, Set<string>>();

  for (const tactic of matrix) {
    for (const technique of tactic.techniques) {
      const tacticIds = techniqueTacticIds.get(technique.id) ?? new Set<string>();
      tacticIds.add(tactic.id);
      techniqueTacticIds.set(technique.id, tacticIds);
    }
  }

  for (const [techniqueId, tacticIds] of techniqueTacticIds.entries()) {
    const technique = matrix
      .flatMap((tactic) => tactic.techniques)
      .find((item) => item.id === techniqueId);
    if (!technique) {
      continue;
    }

    techniques.push({
      id: technique.id,
      name: technique.name,
      reference: ATLAS_REFERENCE,
      value: technique.id,
      label: formatLabel(technique.name, technique.id),
      tacticIds: [...tacticIds],
    });

    for (const subtechnique of technique.subtechniques) {
      if (subtechniques.some((existing) => existing.id === subtechnique.id)) {
        continue;
      }
      subtechniques.push({
        id: subtechnique.id,
        name: subtechnique.name,
        reference: ATLAS_REFERENCE,
        value: subtechnique.id,
        label: formatLabel(subtechnique.name, subtechnique.id),
        tacticIds: [...tacticIds],
        techniqueId: technique.id,
      });
    }
  }

  return {
    tactics: tactics.sort((a, b) => a.id.localeCompare(b.id)),
    techniques: techniques.sort((a, b) => a.id.localeCompare(b.id)),
    subtechniques: subtechniques.sort((a, b) => a.id.localeCompare(b.id)),
  };
};

const loadAtlasThreatOptions = (): Promise<AtlasThreatOptions> => {
  if (cachedOptions) {
    return Promise.resolve(cachedOptions);
  }
  if (!loadPromise) {
    loadPromise = buildOptionsFromYaml()
      .then((options) => {
        cachedOptions = options;
        return options;
      })
      .catch(() => {
        loadPromise = null;
        return emptyOptions;
      });
  }
  return loadPromise;
};

export const useAtlasThreatOptions = (): AtlasThreatOptions => {
  const [options, setOptions] = useState<AtlasThreatOptions>(cachedOptions ?? emptyOptions);

  useEffect(() => {
    let cancelled = false;

    loadAtlasThreatOptions().then((nextOptions) => {
      if (!cancelled) {
        setOptions(nextOptions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return options;
};
