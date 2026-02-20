/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow, type ComponentType as EnzymeComponentType } from 'enzyme';
import { act } from '@testing-library/react';

import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';
import { StepAboutRule, StepAboutRuleReadOnly } from '.';
import { useFetchIndex } from '../../../../common/containers/source';
import { useGetInstalledJob } from '../../../../common/components/ml/hooks/use_get_jobs';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { mockAboutStepRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';
import type { AboutStepRule, DefineStepRule } from '../../../common/types';
import { DataSourceType, AlertSuppressionDurationType } from '../../../common/types';
import { fillEmptySeverityMappings } from '../../../common/helpers';
import { TestProviders } from '../../../../common/mock';
import { useRuleForms } from '../../pages/form';
import { stepActionsDefaultValue } from '../../../rule_creation/components/step_rule_actions';
import { defaultSchedule, stepDefineDefaultValue } from '../../../common/utils';
import type { FormHook } from '../../../../shared_imports';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../rule_creation/components/alert_suppression_edit';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../rule_creation/components/threshold_alert_suppression_edit';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/source');
jest.mock('../../../../common/components/ml/hooks/use_get_jobs');
jest.mock('../../../../common/components/ml_popover/hooks/use_security_jobs');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EuiFieldText: (props: any) => {
      const { isInvalid, isLoading, fullWidth, inputRef, isDisabled, ...validInputProps } = props;
      return <input {...validInputProps} />;
    },
  };
});
const mockedUseKibana = mockUseKibana();
(useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((param) => {
  return param === 'endpointExceptionsMovedUnderManagement';
});

export const stepDefineStepMLRule: DefineStepRule = {
  ruleType: 'machine_learning',
  index: ['default-index-*'],
  queryBar: { query: { query: '', language: '' }, filters: [], saved_id: null },
  machineLearningJobId: ['auth_high_count_logon_events_for_a_source_ip'],
  anomalyThreshold: 50,
  threshold: { cardinality: { value: '', field: [] }, value: '100', field: [] },
  threatIndex: [],
  threatQueryBar: { query: { query: '', language: '' }, filters: [], saved_id: null },
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  timeline: { id: null, title: null },
  eqlOptions: {},
  dataSourceType: DataSourceType.IndexPatterns,
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: ['host.name'],
  [ALERT_SUPPRESSION_DURATION_TYPE_FIELD_NAME]: AlertSuppressionDurationType.PerRuleExecution,
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    [ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME]: 5,
    [ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME]: 'm',
  },
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: AlertSuppressionMissingFieldsStrategyEnum.suppress,
  [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: false,
  newTermsFields: ['host.ip'],
  historyWindowSize: '7d',
  shouldLoadQueryDynamically: false,
};

// FLAKY: https://github.com/elastic/kibana/issues/235182
describe.skip('StepAboutRuleComponent', () => {
  let useGetInstalledJobMock: jest.Mock;
  let useSecurityJobsMock: jest.Mock;
  const TestComp = ({
    setFormRef,
    defineStepDefaultOverride,
  }: {
    setFormRef: (form: FormHook<AboutStepRule, AboutStepRule>) => void;
    defineStepDefaultOverride?: DefineStepRule;
  }) => {
    const defineStepDefault = defineStepDefaultOverride ?? stepDefineDefaultValue;
    const aboutStepDefault = stepAboutDefaultValue;
    const { aboutStepForm } = useRuleForms({
      defineStepDefault,
      aboutStepDefault,
      scheduleStepDefault: defaultSchedule,
      actionsStepDefault: stepActionsDefaultValue,
    });

    setFormRef(aboutStepForm);

    return (
      <StepAboutRule
        ruleType={defineStepDefault.ruleType}
        machineLearningJobId={defineStepDefault.machineLearningJobId}
        index={defineStepDefault.index}
        dataViewId={defineStepDefault.dataViewId}
        timestampOverride={aboutStepDefault.timestampOverride}
        isLoading={false}
        form={aboutStepForm}
      />
    );
  };

  beforeEach(() => {
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
    useGetInstalledJobMock = (useGetInstalledJob as jest.Mock).mockImplementation(() => ({
      jobs: [],
    }));
    useSecurityJobsMock = (useSecurityJobs as jest.Mock).mockImplementation(() => ({ jobs: [] }));
  });

  it('it renders StepRuleDescription if isReadOnlyView is true and "name" property exists', () => {
    const wrapper = shallow(
      <StepAboutRuleReadOnly
        addPadding={false}
        defaultValues={mockAboutStepRule()}
        descriptionColumns="multi"
      />
    );

    expect(wrapper.find(StepRuleDescription).exists()).toBeTruthy();
  });

  it('only shows endpoint exceptions for rule definition if feature flag enabled', async () => {
    const wrapper = mount(<TestComp setFormRef={() => {}} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });
    await act(async () => {
      expect(
        wrapper
          .find('[data-test-subj="detectionEngineStepAboutRuleAssociatedToEndpointList"]')
          .exists()
      ).toBeFalsy();
    });
  });

  it('is invalid if description is not present', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    await act(async () => {
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
        .first()
        .simulate('change', { target: { value: 'Test name text' } });

      const result = await form.validate();
      expect(result).toEqual(false);
    });
  });

  it('is invalid if threat match rule and threat_indicator_path is not present', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
        defineStepDefaultOverride={{ ruleType: 'threat_match' } as DefineStepRule}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    await act(async () => {
      wrapper
        .find('[data-test-subj="ruleThreatMatchIndicatorPath"] input')
        .first()
        .simulate('change', { target: { value: '' } });

      const result = await form.validate();
      expect(result).toEqual(false);
    });
  });

  it('is valid if is not a threat match rule and threat_indicator_path is not present', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });
    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    await act(async () => {
      const result = await form.validate();
      expect(result).toEqual(true);
    });
  });

  it('is invalid if no "name" is present', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    await act(async () => {
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
        .first()
        .simulate('change', { target: { value: 'Test description text' } });
      const result = await form.validate();
      expect(result).toEqual(false);
    });
  });

  it('is valid if both "name" and "description" are present', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });
    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      setup: '',
      references: [''],
      riskScore: { value: 21, mapping: [], isMappingChecked: false },
      severity: {
        value: 'low',
        mapping: fillEmptySeverityMappings([]),
        isMappingChecked: false,
      },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
      investigationFields: [],
      maxSignals: 100,
    };

    await act(async () => {
      const result = await form.submit();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('it allows user to set the risk score as a number (and not a string)', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleRiskScore-defaultRisk"] input')
      .first()
      .simulate('change', { target: { value: '80' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      setup: '',
      references: [''],
      riskScore: { value: 80, mapping: [], isMappingChecked: false },
      severity: {
        value: 'low',
        mapping: fillEmptySeverityMappings([]),
        isMappingChecked: false,
      },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
      investigationFields: [],
      maxSignals: 100,
    };

    await act(async () => {
      const result = await form.submit();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('does not modify the provided risk score until the user changes the severity', async () => {
    let form: FormHook<AboutStepRule, AboutStepRule>;
    const wrapper = mount(
      <TestComp
        setFormRef={(newForm) => {
          form = newForm;
        }}
      />,
      {
        wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      }
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    await act(async () => {
      const result = await form.submit();
      expect(result?.isValid).toEqual(true);
      expect(result?.data?.riskScore.value).toEqual(21);

      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleSeverity"] [data-test-subj="select"]')
        .last()
        .simulate('click');
      wrapper.find('button#medium').simulate('click');

      const result2 = await form.submit();
      expect(result2?.isValid).toEqual(true);
      expect(result2?.data?.riskScore.value).toEqual(47);
    });
  });

  it('should use index based on ML jobs when creating/editing ML rule', async () => {
    (useFetchIndex as jest.Mock).mockClear();
    useSecurityJobsMock.mockImplementation(() => {
      return {
        jobs: [{ id: 'auth_high_count_logon_events_for_a_source_ip', isInstalled: true }],
        loading: false,
      };
    });
    useGetInstalledJobMock.mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual(['auth_high_count_logon_events_for_a_source_ip']);
      return { jobs: [{ results_index_name: 'shared' }] };
    });

    mount(<TestComp setFormRef={() => {}} defineStepDefaultOverride={stepDefineStepMLRule} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    const indexNames = ['.ml-anomalies-shared'];
    expect(useFetchIndex).lastCalledWith(indexNames);
  });

  it('should use default rule index if selected ML jobs are not installed when creating/editing ML rule', async () => {
    (useFetchIndex as jest.Mock).mockClear();
    useSecurityJobsMock.mockImplementation(() => {
      return {
        jobs: [{ id: 'auth_high_count_logon_events_for_a_source_ip', isInstalled: false }],
        loading: false,
      };
    });
    useGetInstalledJobMock.mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return { jobs: [] };
    });

    mount(<TestComp setFormRef={() => {}} defineStepDefaultOverride={stepDefineStepMLRule} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    expect(useFetchIndex).lastCalledWith(stepDefineStepMLRule.index);
  });
});
