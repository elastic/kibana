/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of, NEVER } from 'rxjs';
import { useAlertRuleName } from './use_alert_rule_name';

const searchReturning = (name: string) =>
  jest.fn(() =>
    of({ rawResponse: { hits: { hits: [{ _source: { 'kibana.alert.rule.name': [name] } }] } } })
  );

describe('useAlertRuleName', () => {
  it('reads the rule name from the alerts index', async () => {
    const search = searchReturning('Rule A');

    const { result } = renderHook(() =>
      useAlertRuleName({ alertId: 'a', spaceId: 'default', search: search as never })
    );

    await waitFor(() => expect(result.current).toBe('Rule A'));
  });

  it('does not search when the attachment already carries the name', () => {
    const search = searchReturning('Rule A');

    const { result } = renderHook(() =>
      useAlertRuleName({
        alertId: 'a',
        knownName: 'Known',
        spaceId: 'default',
        search: search as never,
      })
    );

    expect(result.current).toBe('Known');
    expect(search).not.toHaveBeenCalled();
  });

  it('does not show the previous alert name while the next alert loads', async () => {
    const search = jest
      .fn()
      .mockReturnValueOnce(
        of({
          rawResponse: { hits: { hits: [{ _source: { 'kibana.alert.rule.name': 'Rule A' } }] } },
        })
      )
      .mockReturnValueOnce(NEVER);

    const { result, rerender } = renderHook(
      ({ alertId }) => useAlertRuleName({ alertId, spaceId: 'default', search: search as never }),
      { initialProps: { alertId: 'a' } }
    );
    await waitFor(() => expect(result.current).toBe('Rule A'));

    rerender({ alertId: 'b' });

    expect(result.current).toBeUndefined();
  });
});
