/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indicator } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import { useEffect, useState } from 'react';
import type { UseFormGetValues } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import { useGetPreviewData } from '../../../hooks/use_get_preview_data';
import type { CreateSLOForm } from '../types';

interface PreviewParams {
  indicator: Indicator;
  groupBy: string[];
  projectRoutings?: string | null;
}

interface CommittedPreviewParams {
  key: string;
  params: PreviewParams;
}

const serializePreviewParams = (getValues: UseFormGetValues<CreateSLOForm>): string => {
  const [indicator, groupBy, projectRoutings] = getValues([
    'indicator',
    'groupBy',
    'settings.projectRoutings',
  ]);
  return JSON.stringify({ indicator, groupBy: [groupBy].flat(), projectRoutings });
};

const toCommitted = (key: string): CommittedPreviewParams => ({ key, params: JSON.parse(key) });

const PREVIEW_FIELDS = ['indicator', 'groupBy', 'settings.projectRoutings'] as const;

// A change without a name (reset, unregister) or on a path overlapping a preview field may change the params.
const affectsPreviewParams = (name?: string): boolean =>
  name === undefined ||
  PREVIEW_FIELDS.some(
    (field) => name === field || name.startsWith(`${field}.`) || field.startsWith(`${name}.`)
  );

export function useDebouncedGetPreviewData({
  isIndicatorValid,
  range,
}: {
  isIndicatorValid: boolean;
  range: { from: Date; to: Date };
}) {
  const { watch, getValues } = useFormContext<CreateSLOForm>();

  const [committed, setCommitted] = useState(() => toCommitted(serializePreviewParams(getValues)));

  const [commit] = useState(() =>
    debounce(() => {
      const key = serializePreviewParams(getValues);
      setCommitted((previous) => (previous.key === key ? previous : toCommitted(key)));
    }, 800)
  );

  useEffect(() => {
    // The callback form of `watch` subscribes to value changes without registering a global watch,
    // so it does not re-render the form root (react-hook-form 7.44.3).
    const subscription = watch((_values, { name }) => {
      if (affectsPreviewParams(name)) {
        commit();
      }
    });
    // Values set by sibling effects during the first mount are emitted before this subscription exists.
    commit();
    return () => {
      subscription.unsubscribe();
      commit.cancel();
    };
  }, [watch, commit]);

  return useGetPreviewData({
    isValid: isIndicatorValid,
    indicator: committed.params.indicator,
    range,
    groupBy: committed.params.groupBy,
    projectRoutings: committed.params.projectRoutings,
  });
}
