/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { load as loadYaml } from 'js-yaml';
import type { AtlasTactic, AtlasYamlDocument } from './atlas_matrix_helpers';
import { ATLAS_YAML_URL, buildAtlasMatrixFromYaml } from './atlas_matrix_helpers';

interface UseAtlasMatrixResult {
  tactics: AtlasTactic[] | null;
  isLoading: boolean;
  error: Error | null;
}

export const useAtlasMatrix = (enabled: boolean): UseAtlasMatrixResult => {
  const [tactics, setTactics] = useState<AtlasTactic[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || tactics) {
      return;
    }

    let cancelled = false;

    const fetchAtlas = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(ATLAS_YAML_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch ATLAS YAML (${response.status})`);
        }

        const yamlText = await response.text();
        const document = loadYaml(yamlText) as AtlasYamlDocument;
        const matrix = buildAtlasMatrixFromYaml(document);

        if (!cancelled) {
          setTactics(matrix);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAtlas();

    return () => {
      cancelled = true;
    };
  }, [enabled, tactics]);

  return { tactics, isLoading, error };
};
