/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ATLAS_YAML_URL =
  'https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/v6/ATLAS-2026.08.yaml';

export interface AtlasSubTechnique {
  id: string;
  name: string;
  platforms: string[];
}

export interface AtlasTechnique {
  id: string;
  name: string;
  platforms: string[];
  subtechniques: AtlasSubTechnique[];
}

export interface AtlasTactic {
  id: string;
  name: string;
  techniques: AtlasTechnique[];
}

interface AtlasYamlTechnique {
  id: string;
  name: string;
  platforms?: string[];
}

interface AtlasYamlTactic {
  id: string;
  name: string;
}

interface AtlasYamlRelationship {
  achieves?: Array<{ target: string }>;
}

export interface AtlasYamlDocument {
  tactics?: Record<string, AtlasYamlTactic>;
  techniques?: Record<string, AtlasYamlTechnique>;
  relationships?: Record<string, AtlasYamlRelationship>;
}

/** Sub-techniques include a second dotted segment after the technique id (e.g. AML.T0000.001). */
export const isAtlasSubTechnique = (id: string): boolean => id.split('.').length > 2;

/** Parent of AML.T0000.001 → AML.T0000 */
export const getParentAtlasTechniqueId = (subTechniqueId: string): string => {
  const parts = subTechniqueId.split('.');
  return parts.slice(0, -1).join('.');
};

export const buildAtlasMatrixFromYaml = (doc: AtlasYamlDocument): AtlasTactic[] => {
  const tactics = doc.tactics ?? {};
  const techniques = doc.techniques ?? {};
  const relationships = doc.relationships ?? {};

  const techniquesByTactic = new Map<string, AtlasTechnique[]>();

  for (const [techniqueId, relationship] of Object.entries(relationships)) {
    if (isAtlasSubTechnique(techniqueId) || !relationship.achieves?.length) {
      continue;
    }

    const technique = techniques[techniqueId];
    if (!technique) {
      continue;
    }

    for (const { target: tacticId } of relationship.achieves) {
      if (!tactics[tacticId]) {
        continue;
      }

      const list = techniquesByTactic.get(tacticId) ?? [];
      list.push({
        id: technique.id,
        name: technique.name,
        platforms: technique.platforms ?? [],
        subtechniques: [],
      });
      techniquesByTactic.set(tacticId, list);
    }
  }

  for (const [techniqueId, relationship] of Object.entries(relationships)) {
    if (!isAtlasSubTechnique(techniqueId) || !relationship.achieves?.length) {
      continue;
    }

    const subTechnique = techniques[techniqueId];
    if (!subTechnique) {
      continue;
    }

    const parentId = getParentAtlasTechniqueId(techniqueId);

    for (const { target: tacticId } of relationship.achieves) {
      const parents = techniquesByTactic.get(tacticId);
      const parent = parents?.find((technique) => technique.id === parentId);
      if (!parent) {
        continue;
      }

      parent.subtechniques.push({
        id: subTechnique.id,
        name: subTechnique.name,
        platforms: subTechnique.platforms ?? [],
      });
    }
  }

  return Object.values(tactics)
    .map((tactic) => ({
      id: tactic.id,
      name: tactic.name,
      techniques: (techniquesByTactic.get(tactic.id) ?? [])
        .map((technique) => ({
          ...technique,
          subtechniques: [...technique.subtechniques].sort((a, b) => a.id.localeCompare(b.id)),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};
