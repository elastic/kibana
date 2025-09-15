# Component Name
CloudSetup

## Purpose
- Assists users to update Fleet package policies with cloud credentials to connect the ElasticAgent to Elastic platform
- This is a React component that is used by Kibana plugin custom Fleet extensions such as [cloud_security_posture](x-pack/solutions/security/plugins/cloud_security_posture/public/components/fleet_extensions/policy_template_form.tsx) and [cloud_asset_inventory](x-pack/solutions/security/plugins/security_solution/public/asset_inventory/components/fleet_extensions/policy_template_form.tsx)

## Dependencies
- Required libraries, frameworks, or services
- Environment variables / configuration
- External APIs or files

## API / Interface
### Inputs
- **Parameters**: List all with type, format, and validation rules
- **Example input**:
```json
{
  "id": 123,
  "options": ["fast", "secure"]
}


## Coding Standards

- **Language:** TypeScript (use strict mode)
- **Framework:** React (functional components preferred)
- **Testing:** Co-locate unit tests as `*.test.tsx` files
- **Linting:** Run `yarn lint:es` before committing
- **Accessibility:** Follow EUI accessibility guidelines

## Development Workflow

1. **Environment Setup**

   - Use Node.js version from `.nvmrc`
   - Run `yarn kbn bootstrap` before any build or test

2. **Build & Test**

   - Build plugins:
     ```bash
     node scripts/build_kibana_platform_plugins --focus kbnCloudSecurityPosture
     ```
   - Run unit tests:
     ```bash
     yarn test:jest
     ```
   - Run FTR tests (if applicable):
     ```bash
     yarn test:ftr --config x-pack/solutions/security/packages/kbn-cloud-security-posture/test/config.ts
     ```

3. **Code Quality**
   - Use existing shared packages from `packages/` when possible
   - Prefer lazy loading for large components
   - Validate all new code with ESLint and TypeScript checks

## Best Practices

- **Plugin Placement:** Keep Fleet extension code in this directory
- **Naming:** Use kebab-case for files, PascalCase for components



## Reference

- For architecture, testing, and CI details, see  
  `.github/copilot-instructions.md`
- For advanced documentation, see  
  `dev_docs/` in the Kibana repo

---

**Always follow these instructions for consistent, high-quality contributions to Fleet Extensions in Cloud Security Posture.**
