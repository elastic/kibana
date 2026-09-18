/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../../common/project_routings';
import { buildSlo } from '../../../data/slo/slo';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateSLOForm } from '../types';
import {
  transformCreateSLOFormToCreateSLOInput,
  transformPartialSLODataToFormState as transform,
  transformSloResponseToFormState,
  transformValuesToUpdateSLOInput,
} from './process_slo_form_values';

const SUBSET_ROUTING = '_id:p1 AND _id:p2';

const storedSettingsBase = {
  syncDelay: '1m',
  frequency: '1m',
  preventInitialBackfill: false,
};

function formWithSettings(settings: CreateSLOForm['settings']): CreateSLOForm {
  const form = cloneDeep(SLO_EDIT_FORM_DEFAULT_VALUES);
  form.settings = settings;
  return form;
}

function seededLocalForm(settings: Partial<CreateSLOForm['settings']> = {}): CreateSLOForm {
  return formWithSettings({
    preventInitialBackfill: false,
    syncDelay: 1,
    frequency: 1,
    syncField: null,
    projectRoutings: LOCAL_PROJECT_ROUTING,
    ...settings,
  });
}

describe('Transform partial URL state into form state', () => {
  describe("with 'indicator' in URL state", () => {
    it('returns default form values when no indicator type is specified', () => {
      expect(transform({ indicator: { params: { index: 'my-index' } } })).toMatchSnapshot();
    });

    it('handles partial APM Availability state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.apm.transactionErrorRate',
            params: {
              service: 'override-service',
            },
          },
        })
      ).toMatchSnapshot();
    });

    it('handles partial APM Latency state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.apm.transactionDuration',
            params: {
              service: 'override-service',
            },
          },
        })
      ).toMatchSnapshot();
    });

    it('handles partial Custom Query state', () => {
      expect(
        transform({
          indicator: {
            type: 'sli.kql.custom',
            params: {
              good: "some.override.filter:'foo'",
              index: 'override-index',
            },
          },
        })
      ).toMatchSnapshot();
    });
  });

  it('handles partial Custom Metric state', () => {
    expect(
      transform({
        indicator: {
          type: 'sli.metric.custom',
          params: {
            index: 'override-index',
          },
        },
      })
    ).toMatchSnapshot();
  });

  it('handles partial Custom Histogram state', () => {
    expect(
      transform({
        indicator: {
          type: 'sli.histogram.custom',
          params: {
            index: 'override-index',
          },
        },
      })
    ).toMatchSnapshot();
  });

  it("handles the 'budgetingMethod' URL state", () => {
    expect(transform({ budgetingMethod: 'timeslices' })).toMatchSnapshot();
  });

  it("handles the 'timeWindow' URL state", () => {
    expect(
      transform({ timeWindow: { duration: '1M', type: 'calendarAligned' } })
    ).toMatchSnapshot();
  });

  it("handles the 'objective' URL state", () => {
    expect(
      transform({ objective: { target: 0.945, timesliceTarget: 0.95, timesliceWindow: '2m' } })
    ).toMatchSnapshot();
  });

  it("handles the 'filters' URL state", () => {
    expect(
      transform({
        indicator: {
          type: 'sli.kql.custom',
          params: {
            good: {
              kqlQuery: "some.override.filter:'foo'",
              filters: [
                {
                  meta: {
                    alias: 'override-alias',
                    negate: true,
                    disabled: true,
                    key: 'override',
                  },
                },
              ],
            },
            index: 'override-index',
          },
        },
      })
    ).toMatchSnapshot();
  });

  describe('settings', () => {
    it("handles the 'settings' URL state", () => {
      expect(
        transform({ settings: { preventInitialBackfill: true, syncDelay: '3h' } })
      ).toMatchSnapshot();
    });

    it("handles partial 'settings' URL state", () => {
      expect(transform({ settings: { syncDelay: '12m' } })).toMatchSnapshot();
    });

    it("handles optional 'syncField' URL state", () => {
      expect(transform({ settings: { syncField: 'override-field' } })).toMatchSnapshot();
    });

    it("handles 'preventCrossProjectSearch: true' URL state", () => {
      expect(transform({ settings: { preventCrossProjectSearch: true } })).toMatchSnapshot();
    });

    it('carries projectRoutings when present', () => {
      const state = transform({ settings: { projectRoutings: LOCAL_PROJECT_ROUTING } });
      expect(state?.settings.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
    });

    it('does not invent projectRoutings when absent from template', () => {
      const state = transform({ settings: { syncDelay: '12m' } });
      expect(state?.settings.projectRoutings).toBeUndefined();
    });
  });
});

describe('projectRoutings hydrate/submit matrix', () => {
  describe('case 0: both unset', () => {
    const slo = buildSlo({ settings: storedSettingsBase });

    it('hydrates projectRoutings as undefined and does not invent preventCrossProjectSearch', () => {
      const form = transformSloResponseToFormState(slo);
      expect(form?.settings.projectRoutings).toBeUndefined();
      expect(form?.settings.preventCrossProjectSearch).toBeUndefined();
    });

    it('create submit persists LOCAL after seed and omits preventCrossProjectSearch', () => {
      const payload = transformCreateSLOFormToCreateSLOInput(seededLocalForm());
      expect(payload.settings?.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
      expect(payload.settings).not.toHaveProperty('preventCrossProjectSearch');
    });

    it('update submit persists LOCAL after seed and does not send preventCrossProjectSearch', () => {
      const payload = transformValuesToUpdateSLOInput(seededLocalForm());
      expect(payload.settings?.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
      expect(payload.settings).not.toHaveProperty('preventCrossProjectSearch');
    });
  });

  describe('case 1: preventCrossProjectSearch true, routing undefined', () => {
    const slo = buildSlo({
      settings: { ...storedSettingsBase, preventCrossProjectSearch: true },
    });

    it('hydrates LOCAL and keeps the boolean', () => {
      const form = transformSloResponseToFormState(slo);
      expect(form?.settings.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
      expect(form?.settings.preventCrossProjectSearch).toBe(true);
    });

    it('update submit keeps boolean true and persists LOCAL', () => {
      const form = transformSloResponseToFormState(slo);
      if (!form) {
        throw new Error('expected hydrated form');
      }
      const payload = transformValuesToUpdateSLOInput(form);
      expect(payload.settings?.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
      expect(payload.settings?.preventCrossProjectSearch).toBe(true);
    });
  });

  describe('case 2: preventCrossProjectSearch true, routing set', () => {
    const slo = buildSlo({
      settings: {
        ...storedSettingsBase,
        preventCrossProjectSearch: true,
        projectRoutings: SUBSET_ROUTING,
      },
    });

    it('hydrates the stored selection', () => {
      const form = transformSloResponseToFormState(slo);
      expect(form?.settings.projectRoutings).toBe(SUBSET_ROUTING);
      expect(form?.settings.preventCrossProjectSearch).toBe(true);
    });

    it('update submit persists the string and keeps the boolean', () => {
      const form = transformSloResponseToFormState(slo);
      if (!form) {
        throw new Error('expected hydrated form');
      }
      const payload = transformValuesToUpdateSLOInput(form);
      expect(payload.settings?.projectRoutings).toBe(SUBSET_ROUTING);
      expect(payload.settings?.preventCrossProjectSearch).toBe(true);
    });
  });

  describe('case 3: preventCrossProjectSearch false, routing undefined', () => {
    const slo = buildSlo({
      settings: { ...storedSettingsBase, preventCrossProjectSearch: false },
    });

    it('hydrates ALL', () => {
      const form = transformSloResponseToFormState(slo);
      expect(form?.settings.projectRoutings).toBe(ALL_PROJECT_ROUTING);
      expect(form?.settings.preventCrossProjectSearch).toBe(false);
    });

    it('update submit sends false and ALL', () => {
      const form = transformSloResponseToFormState(slo);
      if (!form) {
        throw new Error('expected hydrated form');
      }
      const payload = transformValuesToUpdateSLOInput(form);
      expect(payload.settings?.preventCrossProjectSearch).toBe(false);
      expect(payload.settings?.projectRoutings).toBe(ALL_PROJECT_ROUTING);
    });
  });

  describe('case 4: preventCrossProjectSearch false, routing null or LOCAL', () => {
    it('hydrates null routing as LOCAL', () => {
      const form = transformSloResponseToFormState(
        buildSlo({
          settings: {
            ...storedSettingsBase,
            preventCrossProjectSearch: false,
            projectRoutings: null,
          },
        })
      );
      expect(form?.settings.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
    });

    it('persists LOCAL not null on update', () => {
      const form = transformSloResponseToFormState(
        buildSlo({
          settings: {
            ...storedSettingsBase,
            preventCrossProjectSearch: false,
            projectRoutings: null,
          },
        })
      );
      if (!form) {
        throw new Error('expected hydrated form');
      }
      const payload = transformValuesToUpdateSLOInput(form);
      expect(payload.settings?.projectRoutings).toBe(LOCAL_PROJECT_ROUTING);
      expect(payload.settings?.preventCrossProjectSearch).toBe(false);
    });
  });

  describe('stateful path', () => {
    it('omits projectRoutings and preventCrossProjectSearch from create when field is undefined', () => {
      const payload = transformCreateSLOFormToCreateSLOInput(
        cloneDeep(SLO_EDIT_FORM_DEFAULT_VALUES)
      );
      expect(payload.settings).not.toHaveProperty('projectRoutings');
      expect(payload.settings).not.toHaveProperty('preventCrossProjectSearch');
    });
  });
});
