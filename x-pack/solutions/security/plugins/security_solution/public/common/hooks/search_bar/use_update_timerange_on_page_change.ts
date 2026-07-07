/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import { InputsModelId } from '../../store/inputs/constants';
import type { SecurityPageName } from '../../../app/types';
import { formatDate } from '../../components/super_date_picker';
import { isDetectionsPages } from '../../utils/global_query_string/helpers';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/inputs';
import { useRouteSpy } from '../../utils/route/use_route_spy';

/**
 * Update relative time ranges when navigating between pages.
 *
 * Ex: When 'toStr' is 'now' and we navigate to a new page, it updates `to` with the present date-time.
 *
 * * It does not update the time range on the landing page.
 * * It only updates the time range when navigating to detection pages for performance reasons.
 */
export const useUpdateTimerangeOnPageChange = () => {
  const [{ pageName }] = useRouteSpy();
  const dispatch = useDispatch();
  const previousPage = usePrevious(pageName);
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);

  const { timerange: globalTimerange } = inputState.global;
  const { timerange: timelineTimerange } = inputState.timeline;

  useEffect(() => {
    if (isNavigatingToDetections(pageName, previousPage)) {
      if (timelineTimerange.kind === 'relative') {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...timelineTimerange,
            from: formatDate(timelineTimerange.fromStr),
            to: formatDate(timelineTimerange.toStr, {
              roundUp: true,
            }),
            id: InputsModelId.timeline,
          })
        );
      }

      if (globalTimerange.kind === 'relative') {
        dispatch(
          inputsActions.setRelativeRangeDatePicker({
            ...globalTimerange,
            from: formatDate(globalTimerange.fromStr),
            to: formatDate(globalTimerange.toStr, {
              roundUp: true,
            }),

            id: InputsModelId.global,
          })
        );
      }
    }
  }, [pageName, previousPage, dispatch, timelineTimerange, globalTimerange]);
};

const isNavigatingToDetections = (
  pageName: SecurityPageName | undefined,
  previousPage: SecurityPageName | undefined
) => pageName && previousPage && previousPage !== pageName && isDetectionsPages(pageName);
