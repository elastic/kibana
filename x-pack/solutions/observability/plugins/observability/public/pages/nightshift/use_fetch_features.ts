/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { Feature } from '@kbn/streams-schema';

/**
 * Fetches all Features (KIs) the user has access to, via the real
 * cross-stream route. Used to power the "Impact" badges' click-through
 * detail flyout — Confidence/Type/Sub-type/Tags/Streams/Description, per
 * Kate's latest prototype. Looked up by `id` client-side since there's no
 * single-feature-by-id route exposed.
 */
export function useFetchFeatures(http: HttpStart) {
  const [featuresById, setFeaturesById] = useState<Record<string, Feature>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    http
      .get<{ features: Feature[] }>('/internal/streams/_features')
      .then((response) => {
        if (cancelled) return;
        const byId: Record<string, Feature> = {};
        for (const feature of response.features) {
          byId[feature.id] = feature;
        }
        setFeaturesById(byId);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [http]);

  return { featuresById, isLoading };
}
