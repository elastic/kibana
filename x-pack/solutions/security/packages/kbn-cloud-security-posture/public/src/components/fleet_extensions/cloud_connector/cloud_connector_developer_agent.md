# Cloud Connector Developer Agent Guide

## Overview

This document contains comprehensive knowledge gained during Cloud Connector system development. It serves as a complete reference for future development work on the Cloud Connector system in Kibana's Cloud Security Posture package, covering both AWS and Azure implementations.

## Project Context

**Primary Objective**: Implement a unified cloud connector setup system that enables credential reuse across different cloud provider integrations (AWS, Azure, and future providers).

**Key Achievements**:

- Complete cloud connector system with frontend forms and backend Fleet service integration
- Support for both AWS and Azure cloud providers
- Proper type safety with union types and type guards
- Secret reference handling for sensitive credentials
- Reusable connector dropdown functionality

## Architecture Overview

### System Components

1. **Frontend Forms**:

   - **AWS Components** (`aws_cloud_connector/`):
     - `aws_reusable_connector_form.tsx` - Dropdown for selecting existing AWS connectors
   - **Azure Components** (`azure_cloud_connector/`):
     - `azure_cloud_connector_form.tsx` - Main Azure form component
     - `azure_reusable_connector_form.tsx` - Dropdown for selecting existing Azure connectors
     - `azure_cloud_connector_options.tsx` - Azure-specific form options
   - **Shared Components** (`form/`):
     - `new_cloud_connector_form.tsx` - Form for creating new connectors
     - `reusable_cloud_connector_form.tsx` - Provider-agnostic reusable connector selector

2. **Backend Services** (Fleet plugin):

   - `CloudConnectorService` - CRUD operations for cloud connectors (supports AWS & Azure)
   - `PackagePolicyService` - Integration with package policies
   - Proper secret reference handling for sensitive credentials
   - Type-safe name generation for different providers

3. **Type System**:

   - Union types: `AwsCloudConnectorVars | AzureCloudConnectorVars`
   - Type guards for safe property access: `isAwsCloudConnectorVars`, `isAzureCloudConnectorVars`
   - Secret reference support: `CloudConnectorSecretReference`
   - Provider-specific credential types: `AwsCloudConnectorCredentials`, `AzureCloudConnectorCredentials`

4. **Hooks & Context**:
   - `useGetCloudConnectors` - Fetches all cloud connectors
   - `useCloudConnectorSetup` - Manages connector setup state
   - `useCloudSetupContext` - Provides cloud setup context

## Cloud Connector Setup System

### Core Functionality

The cloud connector setup system provides:

1. **Unified Provider Support**: Single interface supporting multiple cloud providers (AWS, Azure)
2. **Credential Reuse**: Ability to reuse existing cloud connectors across different integrations
3. **New Connector Creation**: Forms for creating new cloud connectors with proper validation
4. **Secret Management**: Secure handling of sensitive credentials using Fleet's secret reference system
5. **Type Safety**: Comprehensive type system preventing runtime errors

### Integration Points

1. **Fleet Plugin Integration**:

   - Cloud connectors are stored as Fleet saved objects
   - Package policies reference cloud connectors via ID
   - Automatic cleanup when connectors are deleted

2. **Package Policy Integration**:

   - `extractPackagePolicyVars()` extracts connector variables from policies
   - `createCloudConnectorForPackagePolicy()` auto-creates connectors during policy creation
   - Support for both new credentials and reused connectors

3. **UI Integration**:
   - Seamless integration with existing Fleet package policy forms
   - Context-aware form rendering based on selected cloud provider
   - Real-time validation and error handling

## Critical Issues & Solutions

### 1. Cloud Connector Creation Error (Substring Issue)

**Problem**: Runtime error `vars.azure.credentials.tenant_id.value.substring is not a function`

**Root Cause**: CloudConnectorService assumed `value` was always a string, but it could be a `CloudConnectorSecretReference` object when handling sensitive credentials.

**Impact**: Affects all cloud providers that use secret references for sensitive data.

**Solution** (`/x-pack/platform/plugins/shared/fleet/server/services/cloud_connector.ts`):

```typescript
// Before (causing error):
name = `azure-connector-${vars['azure.credentials.tenant_id'].value.substring(0, 8)}`;

// After (fixed):
const tenantIdValue = vars['azure.credentials.tenant_id'].value;
const tenantIdString =
  typeof tenantIdValue === 'string'
    ? tenantIdValue
    : (tenantIdValue as CloudConnectorSecretReference).id || 'unknown';
name = `azure-connector-${tenantIdString.substring(0, 8)}`;
```

### 2. Type Guard Function Issues

**Problem**: Cloud connectors not appearing in frontend dropdowns because type guards checked wrong property names.

**Root Cause**: Type guard functions were checking for incorrect property names that didn't match the actual data structure:

- AWS: Checked for `'roleArn'` instead of `'role_arn'`
- Azure: Checked for `'tenantId'` instead of `'azure.credentials.tenant_id'`

**Impact**: Affects connector filtering in reusable connector forms for all providers.

**Solution** (`utils.ts`):

```typescript
export const isAwsCloudConnectorVars = (
  vars: AwsCloudConnectorVars | AzureCloudConnectorVars,
  provider: string
): vars is AwsCloudConnectorVars => {
  return 'role_arn' in vars && provider === 'aws';
};

export const isAzureCloudConnectorVars = (
  vars: AwsCloudConnectorVars | AzureCloudConnectorVars,
  provider: string
): vars is AzureCloudConnectorVars => {
  return 'azure.credentials.tenant_id' in vars && provider === 'azure';
};
```

### 3. Build/Import Error

**Problem**: Build failure due to importing non-public Fleet constants.

**Root Cause**: Attempted to import from `@kbn/fleet-plugin/common/constants/cloud_connector` which is not exposed in public API.

**Solution**: Use literal strings instead of constants:

```typescript
// Removed this import:
// import { ROLE_ARN_VAR_NAME, AZURE_TENANT_ID_VAR_NAME } from '@kbn/fleet-plugin/common/constants/cloud_connector';

// Use literal strings directly:
return 'role_arn' in vars && provider === 'aws';
return 'azure.credentials.tenant_id' in vars && provider === 'azure';
```

## Data Structure Reference

### Cloud Connector Variable Types

#### AWS Cloud Connector Variables

```typescript
interface AwsCloudConnectorVars {
  role_arn: CloudConnectorVar; // AWS Role ARN (string)
  external_id: CloudConnectorSecretVar; // External ID (secret reference)
}
```

#### Azure Cloud Connector Variables

```typescript
interface AzureCloudConnectorVars {
  'azure.credentials.tenant_id': CloudConnectorVar; // Azure Tenant ID (string)
  'azure.credentials.client_id': CloudConnectorVar; // Azure Client ID (string)
  azure_credentials_cloud_connector_id: CloudConnectorVar; // Connector ID reference
}
```

#### Base Variable Types

```typescript
interface CloudConnectorVar {
  type?: 'text';
  value: string;
  frozen?: boolean;
}

interface CloudConnectorSecretVar {
  type?: 'password';
  value: CloudConnectorSecretReference;
  frozen?: boolean;
}

interface CloudConnectorSecretReference {
  isSecretRef: boolean;
  id: string;
}
```

#### Frontend Credential Types

```typescript
interface AwsCloudConnectorCredentials {
  roleArn: string;
  externalId: string;
  cloudConnectorId?: string;
}

interface AzureCloudConnectorCredentials {
  tenantId: string;
  clientId: string;
  cloudConnectorId?: string;
}

type CloudConnectorCredentials = AwsCloudConnectorCredentials | AzureCloudConnectorCredentials;
```

## Fleet Service Integration

### Key Constants

```typescript
// AWS constants
export const ROLE_ARN_VAR_NAME = 'role_arn';
export const EXTERNAL_ID_VAR_NAME = 'external_id';

// Azure constants
export const AZURE_TENANT_ID_VAR_NAME = 'azure.credentials.tenant_id';
export const AZURE_CLIENT_ID_VAR_NAME = 'azure.credentials.client_id';
export const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME = 'azure_credentials_cloud_connector_id';

// Supported variables list
export const SUPPORTED_CLOUD_CONNECTOR_VARS = [
  ROLE_ARN_VAR_NAME,
  EXTERNAL_ID_VAR_NAME,
  AZURE_TENANT_ID_VAR_NAME,
  AZURE_CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME,
];
```

### Cloud Connector Service Methods

- `create(soClient, cloudConnector)` - Creates new cloud connector with provider-specific name generation
- `getList(soClient, options?)` - Retrieves all cloud connectors with optional filtering
- `getById(soClient, id)` - Gets specific cloud connector by ID
- `update(soClient, id, updateRequest)` - Updates existing cloud connector with validation
- `delete(soClient, id, force?)` - Removes cloud connector (with force option for connectors in use)
- `validateCloudConnectorDetails(cloudConnector)` - Validates connector configuration

### Package Policy Integration

- `extractPackagePolicyVars(packagePolicy, cloudProvider)` - Extracts connector vars from package policy
- `createCloudConnectorForPackagePolicy(soClient, packagePolicy)` - Auto-creates connector during policy creation
- `updatePolicyWithNewCredentials(policy, credentials, provider)` - Updates policy with new connector credentials

### Provider-Specific Logic

The service handles multiple cloud providers through:

- Type guards (`isAwsCloudConnectorVars`, `isAzureCloudConnectorVars`)
- Provider-specific validation rules
- Dynamic name generation based on provider
- Proper variable mapping for each provider

## Testing Strategy

### Unit Tests Added

1. **Type Guard Tests** (`utils.test.ts`):

   - AWS/Azure connector identification
   - Provider-specific validation
   - Edge cases and error conditions

2. **Cloud Connector Service Tests** (`cloud_connector.test.ts`):
   - Azure connector creation with string values
   - Name generation with long tenant IDs
   - Error handling scenarios

### Test Patterns

```typescript
// Type guard testing pattern
const azureVars: AzureCloudConnectorVars = {
  'azure.credentials.tenant_id': { value: 'test-tenant-id' },
  'azure.credentials.client_id': { value: 'test-client-id' },
  azure_credentials_cloud_connector_id: { value: 'connector-id' },
};

expect(isAzureCloudConnectorVars(azureVars, 'azure')).toBe(true);
```

## Build & Development

### Build Commands

```bash
# Clean build
yarn kbn clean

# Build specific plugin
node scripts/build_kibana_platform_plugins --focus cloudSecurityPosture

# Build Fleet plugin (for backend changes)
node scripts/build_kibana_platform_plugins --focus fleet
```

### Development Server

```bash
# Start Elasticsearch
yarn es snapshot

# Start Kibana
yarn start
```

### Testing Commands

```bash
# Run specific tests
yarn test:jest path/to/test.ts --testNamePattern="test name"

# Run type guard tests
yarn test:jest utils.test.ts --testNamePattern="Cloud Connector Type Guards"
```

## Common Pitfalls & Solutions

### 1. Import Restrictions

- **Issue**: Cannot import from internal Fleet plugin paths
- **Solution**: Use public APIs only or define constants locally

### 2. Type Safety with Union Types

- **Issue**: TypeScript errors when accessing properties on union types
- **Solution**: Use type guards before property access

### 3. Secret Reference Handling

- **Issue**: Assuming values are always strings
- **Solution**: Check type and handle both strings and CloudConnectorSecretReference objects

### 4. Build Cache Issues

- **Issue**: Changes not reflected after build
- **Solution**: Run `yarn kbn clean` before rebuilding

## File Structure Reference

```
x-pack/solutions/security/packages/kbn-cloud-security-posture/public/src/components/fleet_extensions/
├── cloud_connector/
│   ├── azure_cloud_connector/
│   │   ├── azure_cloud_connector_form.tsx
│   │   ├── azure_reusable_connector_form.tsx
│   │   └── azure_cloud_connector_options.tsx
│   ├── aws_cloud_connector/
│   │   └── aws_reusable_connector_form.tsx
│   ├── form/
│   │   ├── new_cloud_connector_form.tsx
│   │   └── reusable_cloud_connector_form.tsx
│   ├── hooks/
│   │   ├── use_get_cloud_connectors.ts
│   │   └── use_cloud_connector_setup.ts
│   ├── utils.ts                    # Type guards and utility functions
│   ├── utils.test.ts              # Comprehensive test suite
│   ├── types.ts                   # TypeScript type definitions
│   └── constants.ts               # Frontend constants
├── cloud_setup.tsx                # Main integration component
└── hooks/
    └── use_cloud_setup_context.tsx
```

## Fleet Plugin Integration Points

```
x-pack/platform/plugins/shared/fleet/
├── server/services/
│   ├── cloud_connector.ts         # Main service with Azure support
│   ├── cloud_connector.test.ts    # Service tests
│   └── package_policy.ts          # Policy integration
├── common/
│   ├── types/models/cloud_connector.ts  # Type definitions
│   └── constants/cloud_connector.ts     # Backend constants
└── public/                        # Public API exports
```

## Future Development Guidelines

### Adding New Cloud Providers

**Complete Process for New Provider Integration:**

1. **Backend Fleet Integration**:

   - Define provider-specific variable interface in `fleet/common/types/models/cloud_connector.ts`
   - Add constants in `fleet/common/constants/cloud_connector.ts`
   - Update CloudConnectorService with provider-specific logic
   - Add validation rules for the new provider
   - Update name generation logic

2. **Frontend Integration**:

   - Add type guard function in `utils.ts`
   - Create provider-specific credential types in `types.ts`
   - Build provider-specific form components
   - Add reusable connector form for the provider
   - Update utility functions for credential handling

3. **Testing Strategy**:

   - Add unit tests for type guards
   - Test CloudConnectorService with new provider
   - Add form validation tests
   - Test credential reuse functionality
   - Verify secret reference handling

4. **Integration Points**:
   - Update package policy extraction logic
   - Test integration with existing package policy forms
   - Verify Fleet UI integration
   - Test end-to-end connector creation and reuse

### Extending Cloud Connector Features

**Secret Reference Support**:

1. Update CloudConnectorSecretReference handling in backend services
2. Add proper type guards for secret vs plain text values
3. Test both creation and update flows with secrets
4. Ensure proper cleanup of secret references

**Advanced Filtering & Search**:

1. Add search functionality to reusable connector dropdowns
2. Implement provider-specific filtering
3. Add sorting options (by name, creation date, usage)
4. Support for connector tagging/categorization

**Connector Analytics**:

1. Track connector usage across package policies
2. Add connector health checking
3. Monitor credential rotation requirements
4. Usage reporting and dashboards

### API Design Guidelines

**Import Restrictions**:

- Always check Fleet plugin public API exports before importing
- Use literal strings for constants not exposed publicly
- Maintain backward compatibility with existing connectors
- Document all public API changes

**Type Safety**:

- Use union types for multi-provider support
- Implement comprehensive type guards
- Avoid `any` types in production code
- Use generics for reusable provider logic

**Error Handling**:

- Provide meaningful error messages for validation failures
- Handle network failures gracefully
- Support retry logic for transient failures
- Log errors with sufficient context for debugging

## Debugging Tips

### Frontend Issues

1. Check browser console for import/export errors
2. Verify type guard functions are working correctly
3. Use React DevTools to inspect component state

### Backend Issues

1. Check Kibana server logs for CloudConnectorService errors
2. Verify Fleet plugin integration is working
3. Test with both string and secret reference values

### Build Issues

1. Clear build cache with `yarn kbn clean`
2. Check for non-public import paths
3. Verify all required dependencies are included

---

_This document was generated during the Azure Cloud Connector integration development session and should be updated as the system evolves._
