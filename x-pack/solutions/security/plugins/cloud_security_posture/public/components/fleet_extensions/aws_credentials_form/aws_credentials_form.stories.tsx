// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import React, { useState } from 'react';
// import { Meta, Story } from '@storybook/react';
// import { AwsCredentialsForm, AwsFormProps } from './aws_credentials_form';
// import { NewPackagePolicyPostureInput } from '../utils';
// import { getMockPolicyAWS, getMockPackageInfo } from '../mocks';

// const mockNewPolicy = getMockPolicyAWS({
//   access_key_id: {
//     type: 'text',
//     value: 'access-key-id',
//   },
//   secret_access_key: {
//     type: 'text',
//     value: 'secret-access-key',
//   },
// });

// const mockInput = {
//   ...mockNewPolicy.inputs[0],
//   type: 'cloudbeat/cis_aws', // Ensure the type is 'cloudbeat/cis_aws'
//   policy_template: 'cspm',
// } as NewPackagePolicyPostureInput;

// const mockPackageInfo = getMockPackageInfo();

// const defaultProps: AwsFormProps = {
//   newPolicy: mockNewPolicy,
//   input: mockInput,
//   updatePolicy: () => {},
//   onChange: () => {},
//   packageInfo: mockPackageInfo,
//   setIsValid: () => {},
//   disabled: false,
//   hasInvalidRequiredVars: false,
// };

// export default {
//   title: 'Integration Components/AwsCredentialsForm',
//   component: AwsCredentialsForm,
//   //   argTypes: initialArgs,
// } as Meta;

// const Template: Story<AwsFormProps> = (props: AwsFormProps) => <AwsCredentialsForm {...props} />;

// export function Example() {
//   const [packagePolicy, setPackagePolicy] = useState(mockNewPolicy);

//   const updatePackagePolicy = (updatedPolicy: typeof packagePolicy) => {
//     console.log('updatePackagePolicy', updatedPolicy);
//     setPackagePolicy(updatedPolicy);
//   };

//   console.log('packagePolicy', packagePolicy);
//   const props = {
//     ...defaultProps,
//     newPolicy: packagePolicy,
//     updatePolicy: updatePackagePolicy,
//   };
//   return <AwsCredentialsForm {...props} />;
// }
// export const WithInitialValues = Template.bind({});
// WithInitialValues.args = defaultProps;

// // export const WithValidationErrors = Template.bind({});
// // WithValidationErrors.args = {
// //   // Provide props to simulate validation errors
// //   initialValues: {
// //     accessKeyId: '',
// //     secretAccessKey: '',
// //     sessionToken: '',
// //   },
// //   validationErrors: {
// //     accessKeyId: 'Access Key ID is required',
// //     secretAccessKey: 'Secret Access Key is required',
// //     sessionToken: 'Session Token is required',
// //   },
// // };
