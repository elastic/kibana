/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression } from '@kbn/es-query';
import { useHistory } from 'react-router-dom';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { mergeRumSearch } from '../../../utils/rum_search';

const isValidKuery = (value: string): boolean => {
  const text = value.trim();
  if (!text) {
    return true;
  }
  try {
    fromKueryExpression(text);
    return true;
  } catch {
    return false;
  }
};

export function RumKueryBar() {
  const history = useHistory();
  const {
    urlParams: { kuery = '' },
  } = useLegacyUrlParams();
  const [draft, setDraft] = useState(kuery);

  useEffect(() => {
    setDraft(kuery);
  }, [kuery]);

  const valid = useMemo(() => isValidKuery(draft), [draft]);

  const apply = (value: string) => {
    if (!isValidKuery(value)) {
      return;
    }
    history.push({
      ...history.location,
      search: mergeRumSearch(history.location.search, { kuery: value.trim() }),
    });
  };

  const kqlLabel = i18n.translate('xpack.ux.filters.kuery.label', {
    defaultMessage: 'KQL',
  });

  return (
    <EuiFieldText
      fullWidth
      compressed
      prepend={kqlLabel}
      value={draft}
      isInvalid={!valid}
      title={
        valid
          ? undefined
          : i18n.translate('xpack.ux.filters.kuery.invalid', {
              defaultMessage: 'Invalid KQL',
            })
      }
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          apply(draft);
        }
      }}
      placeholder={i18n.translate('xpack.ux.filters.kuery.placeholder', {
        defaultMessage: 'Filter with KQL',
      })}
      aria-label={kqlLabel}
      data-test-subj="uxKueryBar"
    />
  );
}
