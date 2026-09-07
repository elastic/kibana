# CloudSetup Component Guide for Claude Code

This guide provides comprehensive instructions for working with the CloudSetup component system in Kibana's Cloud Security Posture package.

## Overview

The CloudSetup component system provides a unified interface for configuring cloud security integrations across AWS, GCP, and Azure platforms. It handles credential management, setup formats, account types, and deployment methods.

## Core Architecture

### Main Components Hierarchy

```
CloudSetup (Main Container)
├── CloudSetupProvider (Context Provider)
├── ProviderSelector (Cloud Provider Selection)
├── AWS Components
│   ├── AwsCredentialsForm
│   ├── AwsCredentialsFormAgentless
│   ├── AwsAccountTypeSelector
│   ├── AwsCredentialTypeSelector
│   ├── AwsInputVarFields
│   └── AwsSetupInfo
├── GCP Components
│   ├── GcpCredentialsForm
│   ├── GcpCredentialsFormAgentless
│   ├── GcpAccountTypeSelector
│   └── GcpInputVarFields
├── Azure Components
│   ├── AzureCredentialsForm
│   ├── AzureCredentialsFormAgentless
│   ├── AzureAccountTypeSelector
│   ├── AzureCredentialTypeSelector
│   └── AzureInputVarFields
└── Common Components
    ├── ReadDocumentation
    ├── IntegrationSettings
    └── RadioGroup
```

## Core Context System

### CloudSetupProvider

**Location**: `cloud_setup_context.tsx`

Provides global state and configuration for all cloud setup components.

**Props**:

- `packagePolicy: NewPackagePolicy` - Fleet package policy configuration
- `packageInfo: PackageInfo` - Package metadata and version info
- `config: CloudSetupConfig` - Provider-specific configuration
- `uiSettings: IUiSettingsClient` - Kibana UI settings
- `cloud: CloudSetup` - Cloud plugin configuration
- `children: React.ReactNode` - Child components

**Usage**:

```tsx
<CloudSetupProvider
  packagePolicy={policy}
  packageInfo={info}
  config={cloudConfig}
  uiSettings={uiSettings}
  cloud={cloudSetup}
>
  {/* Your components */}
</CloudSetupProvider>
```

### useCloudSetup Hook

**Location**: `hooks/use_cloud_setup_context.tsx`

Hook for accessing cloud setup context throughout the component tree.

**Returns**:

- `awsPolicyType: string` - AWS policy type identifier
- `gcpPolicyType: string` - GCP policy type identifier
- `azurePolicyType: string` - Azure policy type identifier
- `shortName: string` - Integration short name (e.g., "CSPM")
- `templateName: string` - Template name for CloudFormation/ARM
- `awsInputFieldMapping: AwsInputFieldMapping` - Field mappings for AWS forms
- `isAwsCloudConnectorEnabled: boolean` - Cloud connector availability
- Cloud connector templates and configuration

## AWS Components

### AwsCredentialsForm

**Location**: `aws_credentials_form/aws_credentials_form.tsx`

Main AWS credentials configuration component.

**Props**:

- `newPolicy: NewPackagePolicy` - Policy being configured
- `input: NewPackagePolicyInput` - Specific input configuration
- `updatePolicy: UpdatePolicy` - Function to update policy state
- `packageInfo: PackageInfo` - Package information
- `disabled: boolean` - Whether form is disabled
- `hasInvalidRequiredVars: boolean` - Validation state
- `isValid: boolean` - Overall form validity

**Key Features**:

- CloudFormation vs Manual setup selection
- Organization vs Single account support
- Dynamic credential type selection
- Integration with AWS hooks

**Test Selectors**:

- `aws-setup-info` - Setup information section
- `aws-cloudformation-setup-option` - CloudFormation radio button
- `aws-manual-setup-option` - Manual setup radio button
- `aws-credentials-type-selector` - Credential type dropdown
- `externalLink` - Documentation links

### AwsCredentialTypeSelector

**Location**: `aws_credentials_form/aws_credential_type_selector.tsx`

Dropdown for selecting AWS credential types (assume role, direct keys, etc.).

**Props**:

- `type: string` - Currently selected credential type
- `options: Array` - Available credential options
- `onChange: (type: string) => void` - Change handler
- `disabled: boolean` - Disabled state
- `label: string` - Field label

**Supported Types**:

- `assume_role` - IAM role assumption
- `direct_access_keys` - Access key/secret key
- `temporary_keys` - Temporary security credentials
- `shared_credentials` - Shared credentials file
- `cloud_connectors` - Cloud connector integration
- `cloud_formation` - CloudFormation deployment

### AwsAccountTypeSelector

**Location**: `aws_credentials_form/aws_account_type_selector.tsx`

Selector for AWS account deployment type.

**Props**:

- `input: NewPackagePolicyInput` - Input configuration
- `newPolicy: NewPackagePolicy` - Policy configuration
- `updatePolicy: UpdatePolicy` - Update function
- `packageInfo: PackageInfo` - Package info

**Account Types**:

- `single-account` - Single AWS account
- `organization-account` - AWS Organizations management account

### AwsInputVarFields

**Location**: `aws_credentials_form/aws_input_var_fields.tsx`

Dynamic form fields for AWS credential inputs.

**Props**:

- `fields: Array` - Field configuration array
- `packageInfo: PackageInfo` - Package information
- `onChange: (key: string, value: string) => void` - Change handler

**Dynamic Fields** (based on credential type):

- Access Key ID
- Secret Access Key
- Session Token
- Role ARN
- External ID
- Shared Credentials File
- Credential Profile Name

### AwsSetupInfo

**Location**: `aws_credentials_form/aws_setup_info.tsx`

Informational component explaining AWS setup process.

**Props**:

- `info: React.ReactNode` - Informational content to display

## GCP Components

### GcpCredentialsForm

**Location**: `gcp_credentials_form/gcp_credential_form.tsx`

Main GCP credentials configuration component.

**Features**:

- Cloud Shell vs Manual setup
- Service account key management
- Project ID configuration
- Credentials file upload

### GcpAccountTypeSelector

Similar to AWS account type selector but for GCP organizations.

**Account Types**:

- `single-project` - Single GCP project
- `organization-project` - GCP organization

### GcpInputVarFields

Dynamic form fields for GCP-specific inputs:

- Project ID
- Credentials JSON
- Service Account Key File

## Azure Components

### AzureCredentialsForm

**Location**: `azure_credentials_form/azure_credentials_form.tsx`

Main Azure credentials configuration component.

**Features**:

- ARM Template vs Manual setup
- Service principal configuration
- Managed identity support
- Subscription/tenant management

### AzureCredentialTypeSelector

Azure-specific credential type selection.

**Supported Types**:

- `service_principal_with_client_secret`
- `service_principal_with_client_certificate`
- `service_principal_with_client_username_and_password`
- `managed_identity`
- `arm_template`
- `cloud_connectors`

### AzureAccountTypeSelector

Azure account deployment type selector.

**Account Types**:

- `single-account` - Single Azure subscription
- `organization-account` - Azure organization (tenant root group)

## Common Components

### ReadDocumentation

**Location**: `common.tsx`

Reusable component for documentation links.

**Props**:

- `url: string` - Documentation URL

**Features**:

- Opens links in new tab
- Consistent styling
- Accessibility support

**Test Selector**: `externalLink`

### RadioGroup

**Location**: `csp_boxed_radio_group.tsx`

Custom radio button group component.

**Props**:

- `options: CspRadioOption[]` - Radio button options
- `idSelected: string` - Currently selected option
- `onChange: (id: string) => void` - Change handler
- `disabled: boolean` - Disabled state
- `size: 's' | 'm' | 'l'` - Size variant
- `name: string` - Form field name

## Configuration System

### CloudSetupConfig

**Location**: `types.ts`

Main configuration interface for cloud setup.

```typescript
interface CloudSetupConfig {
  policyTemplate: string; // Policy template name
  name: string; // Full integration name
  shortName: string; // Short name (e.g., "CSPM")
  defaultProvider: CloudProviders; // Default cloud provider
  namespaceSupportEnabled?: boolean;
  overviewPath: string; // Overview page path
  getStartedPath: string; // Getting started path
  showCloudTemplates: boolean; // Enable cloud templates
  providers: {
    aws: AwsCloudProviderConfig;
    gcp: GcpCloudProviderConfig;
    azure: AzureProviderConfig;
  };
}
```

### Provider-Specific Configuration

#### AwsCloudProviderConfig

```typescript
interface AwsCloudProviderConfig extends CloudProviderConfig {
  inputFieldMapping?: AwsInputFieldMapping; // Field mappings
}
```

#### CloudProviderConfig

```typescript
interface CloudProviderConfig {
  type: string; // Provider policy type
  enableOrganization?: boolean; // Organization support
  getStartedPath: string; // Documentation path
  enabled?: boolean; // Provider enabled
  cloudConnectorEnabledVersion?: string; // Min version for connectors
}
```

## Constants Reference

### Setup Formats

```typescript
// AWS
AWS_SETUP_FORMAT = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
};

// Azure
AZURE_SETUP_FORMAT = {
  ARM_TEMPLATE: 'arm_template',
  MANUAL: 'manual',
};

// GCP
GCP_SETUP_ACCESS = {
  CLOUD_SHELL: 'google_cloud_shell',
  MANUAL: 'manual',
};
```

### Credential Types

```typescript
// AWS
AWS_CREDENTIALS_TYPE = {
  CLOUD_CONNECTORS: 'cloud_connectors',
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
};

// GCP
GCP_CREDENTIALS_TYPE = {
  CREDENTIALS_FILE: 'credentials-file',
  CREDENTIALS_JSON: 'credentials-json',
  CREDENTIALS_NONE: 'credentials-none',
};

// Azure
AZURE_CREDENTIALS_TYPE = {
  ARM_TEMPLATE: 'arm_template',
  CLOUD_CONNECTORS: 'cloud_connectors',
  SERVICE_PRINCIPAL_WITH_CLIENT_SECRET: 'service_principal_with_client_secret',
  SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE: 'service_principal_with_client_certificate',
  SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD:
    'service_principal_with_client_username_and_password',
  MANAGED_IDENTITY: 'managed_identity',
};
```

## Testing Guidelines

### Component Testing

- Use `I18nProvider` wrapper for components with internationalization
- Mock hooks using `jest.mock()` for isolated component testing
- Use real implementations where possible for integration testing
- Prefer `screen.getByLabelText()` and `screen.getByRole()` over test IDs

### Common Test Patterns

```typescript
// Setup component with providers
const renderWithProviders = (props: ComponentProps) => {
  return render(
    <I18nProvider>
      <ComponentName {...props} />
    </I18nProvider>
  );
};

// Mock hook returns
mockUseAwsCredentialsForm.mockReturnValue({
  awsCredentialsType: 'direct_access_keys',
  setupFormat: AWS_SETUP_FORMAT.MANUAL,
  // ... other returns
});

// Test user interactions
fireEvent.click(screen.getByRole('radio', { name: 'CloudFormation' }));
expect(mockOnSetupFormatChange).toHaveBeenCalledWith(AWS_SETUP_FORMAT.CLOUD_FORMATION);
```

### Key Test Selectors

- `aws-cloudformation-setup-option` - CloudFormation radio
- `aws-manual-setup-option` - Manual setup radio
- `aws-credentials-type-selector` - Credential type dropdown
- `externalLink` - Documentation links
- `aws-setup-info` - Setup information sections

## Utility Functions

### updatePolicyWithInputs

Updates package policy with new input values.

**Parameters**:

- `policy: NewPackagePolicy` - Current policy
- `policyType: string` - Provider policy type
- `updates: Record<string, any>` - Updates to apply

### getAwsCredentialsType

Extracts current AWS credentials type from input configuration.

### getCloudFormationDefaultValue

Gets CloudFormation template URL from package info.

## Error Handling

### Common Error Scenarios

1. **Missing CloudFormation template**: Show warning message
2. **Invalid credentials**: Highlight validation errors
3. **Network connectivity**: Handle cloud connector failures
4. **Version compatibility**: Check minimum versions for features

### Validation Patterns

- Required field validation
- Format validation (JSON, URLs, etc.)
- Cross-field validation (e.g., role ARN format)
- Version compatibility checks

## Integration Points

### Fleet Plugin Integration

- `NewPackagePolicy` and `NewPackagePolicyInput` types
- `updatePolicy` callback for policy changes
- `PackageInfo` for version and metadata

### Cloud Plugin Integration

- Cloud connector detection
- Multi-cloud deployment support
- Elastic Stack ID resolution

### UI Settings Integration

- Feature flag management
- User preference storage
- Theme and localization

## Development Best Practices

### Component Development

1. **Use TypeScript interfaces** for all props and state
2. **Implement proper error boundaries** for graceful failures
3. **Add comprehensive test coverage** including edge cases
4. **Follow accessibility guidelines** with proper ARIA labels
5. **Use consistent naming conventions** across components

### State Management

1. **Minimize local state** - prefer context for shared data
2. **Use proper dependency arrays** in useEffect hooks
3. **Handle async operations** with proper loading states
4. **Implement optimistic updates** where appropriate

### TypeScript Best Practices - Avoiding `any` Types

#### Why Avoid `any`

Using `any` defeats the purpose of TypeScript by:

- Disabling type checking and losing compile-time safety
- Eliminating IntelliSense and code completion
- Making refactoring dangerous and error-prone
- Hiding potential runtime errors until production

#### Strategies to Replace `any`

##### 1. Use Specific Interface Definitions

```typescript
// ❌ Bad - loses all type safety
const handleChange = (event: any) => {
  setFormData(event.target.value);
};

// ✅ Good - specific event type
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setFormData(event.target.value);
};

// ✅ Good - custom interface for complex objects
interface AwsCredentialsFormData {
  accessKeyId: string;
  secretAccessKey: string;
  roleArn?: string;
  externalId?: string;
}

const handleFormSubmit = (formData: AwsCredentialsFormData) => {
  // Type-safe access to properties
  updatePolicy({ 'aws.access_key_id': { value: formData.accessKeyId } });
};
```

##### 2. Use Generic Types for Reusable Components

```typescript
// ❌ Bad - any loses type information
interface RadioGroupProps {
  options: any[];
  onChange: (value: any) => void;
}

// ✅ Good - generic preserves type safety
interface RadioGroupProps<T> {
  options: Array<{
    id: T;
    label: string;
    testId: string;
  }>;
  onChange: (value: T) => void;
  idSelected: T;
}

// Usage with specific types
<RadioGroup<AwsSetupFormat>
  options={setupFormatOptions}
  idSelected={setupFormat}
  onChange={(format) => onSetupFormatChange(format)} // format is typed as AwsSetupFormat
/>;
```

##### 3. Use Union Types for Known Variations

```typescript
// ❌ Bad - any allows invalid values
interface ComponentProps {
  size: any;
  variant: any;
}

// ✅ Good - union types restrict to valid values
interface ComponentProps {
  size: 'small' | 'medium' | 'large';
  variant: 'primary' | 'secondary' | 'danger';
}

// ✅ Use const assertions for better type inference
const AWS_SETUP_FORMATS = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
} as const;

type AwsSetupFormat = (typeof AWS_SETUP_FORMATS)[keyof typeof AWS_SETUP_FORMATS];
```

##### 4. Use `unknown` Instead of `any` for Truly Unknown Data

```typescript
// ❌ Bad - any bypasses all checks
const parseApiResponse = (response: any) => {
  return response.data.items; // No type checking
};

// ✅ Good - unknown forces type checking
const parseApiResponse = (response: unknown): ApiItem[] => {
  if (isApiResponse(response)) {
    return response.data.items; // Type-safe after validation
  }
  throw new Error('Invalid API response format');
};

// Type guard function
const isApiResponse = (obj: unknown): obj is ApiResponse => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    typeof (obj as any).data === 'object'
  );
};
```

##### 5. Use Utility Types for Complex Scenarios

```typescript
// ✅ Use Pick to select specific properties
type UpdatePolicyParams = Pick<NewPackagePolicy, 'inputs' | 'name' | 'vars'>;

// ✅ Use Partial for optional updates
type PolicyUpdates = Partial<NewPackagePolicy>;

// ✅ Use Record for key-value mappings
type FieldMappings = Record<string, { value: string; type?: string }>;

// ✅ Use Extract/Exclude for union manipulation
type ManualCredentialTypes = Exclude<AwsCredentialsType, 'cloud_formation'>;
```

##### 6. Proper Event Handler Typing

```typescript
// ❌ Bad - loses event type information
const handleClick = (e: any) => {
  e.preventDefault();
  // No type safety for event properties
};

// ✅ Good - specific event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault(); // Type-safe event methods
  const target = e.currentTarget; // Typed as HTMLButtonElement
};

const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const { value, name } = e.target; // Both are typed correctly
  updateFormField(name, value);
};
```

##### 7. Mock Types in Tests

```typescript
// ❌ Bad - any in mocks loses type safety
const mockUpdatePolicy = jest.fn() as any;

// ✅ Good - properly typed mocks
const mockUpdatePolicy = jest.fn<void, [UpdatePolicyParams]>();

// ✅ Use jest.MockedFunction for existing functions
const mockUseAwsCredentialsForm = useAwsCredentialsForm as jest.MockedFunction<
  typeof useAwsCredentialsForm
>;

// ✅ Type mock return values
mockUseAwsCredentialsForm.mockReturnValue({
  awsCredentialsType: 'direct_access_keys' as AwsCredentialsType,
  setupFormat: AWS_SETUP_FORMAT.MANUAL,
  hasCloudFormationTemplate: true,
  onSetupFormatChange: jest.fn(),
  // ... other properly typed properties
});
```

##### 8. Handle External Library Types

```typescript
// ❌ Bad - any for external libraries
const processFleetData = (fleetData: any) => {
  return fleetData.inputs.map((input: any) => input.config);
};

// ✅ Good - import proper types from libraries
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';

const processFleetData = (policy: NewPackagePolicy): PolicyConfig[] => {
  return policy.inputs.map((input: NewPackagePolicyInput) => input.config);
};

// ✅ Create wrapper types if library types are insufficient
interface EnhancedPackagePolicy extends NewPackagePolicy {
  cloudSetupMetadata?: {
    provider: CloudProviders;
    setupFormat: string;
  };
}
```

#### ESLint Rules to Enforce Type Safety

Add these rules to your ESLint configuration:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error"
  }
}
```

#### Migration Strategy for Existing `any` Types

1. **Identify all `any` usages** with `grep -r ": any" --include="*.ts" --include="*.tsx"`
2. **Start with function parameters and return types** - highest impact
3. **Replace with `unknown` first** if exact type is unclear
4. **Create specific interfaces** for recurring patterns
5. **Add type guards** for runtime validation
6. **Test thoroughly** after each replacement

#### Common Cloud Setup Type Definitions

```typescript
// Use these instead of any for common scenarios
type CloudProvider = 'aws' | 'gcp' | 'azure';
type SetupFormat = 'manual' | 'cloud_formation' | 'arm_template' | 'google_cloud_shell';
type CredentialType = AwsCredentialsType | GcpCredentialsType | AzureCredentialsType;

interface CloudSetupFormProps {
  provider: CloudProvider;
  setupFormat: SetupFormat;
  credentialType: CredentialType;
  onUpdate: (updates: PolicyUpdates) => void;
  disabled: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}
```

### Testing Strategy

1. **Unit test individual components** with mocked dependencies
2. **Integration test component interactions** with real dependencies
3. **Test accessibility** with screen readers and keyboard navigation
4. **Test error scenarios** and edge cases
5. **Validate internationalization** with different locales

This guide provides comprehensive coverage of the CloudSetup component system. When working with these components, refer to the specific component files for detailed implementation examples and the test files for usage patterns.
