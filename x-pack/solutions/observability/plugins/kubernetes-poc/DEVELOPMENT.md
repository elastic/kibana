# Kubernetes POC Plugin - Development Notes

## Current Status

**Last Updated:** 2025-12-10

### ✅ Completed
- [x] Plugin scaffolded with basic structure
- [x] Server-side route factory using `@kbn/server-route-repository`
- [x] Hello World API endpoint (`GET /internal/kubernetes_poc/hello_world`)
- [x] Client-side API client with type-safe route repository integration
- [x] React UI with Hello World page
- [x] Security configuration (authz) for routes
- [x] Plugin manifest configured with required dependencies
- [x] Removed unused `kibanaReact` bundle

### 🚧 In Progress
- None currently

### 📋 Next Steps / TODO
- [ ] Add Kubernetes Overview Page 
- [ ] Add Kubernetes Cluster Listing Page 
- [ ] Add Kubernetes Cluster Detail Flyout 

## Architecture

### Plugin Structure
```
kubernetes-poc/
├── common/              # Shared code (client & server)
├── public/              # Client-side code
│   ├── application/     # React components
│   └── services/        # API clients
└── server/              # Server-side code
    └── routes/          # API route handlers
```

### Key Patterns Used
- **Server Routes**: Using `@kbn/server-route-repository` for type-safe API routing
- **Route Factory**: `createKubernetesPocServerRoute` in `server/routes/create_kubernetes_poc_server_route.ts`
- **Route Repository**: Routes aggregated in `server/routes/index.ts`
- **API Client**: Type-safe client in `public/services/rest/create_call_api.ts`

### Dependencies
- **Required Plugins**: `data`, `observability`, `observabilityShared`
- **Required Bundles**: None (removed unused `kibanaReact`)

## Development Workflow

### Bootstrap Plugin
```bash
yarn kbn bootstrap
```

### Start Kibana
```bash
yarn start
```

### Access Plugin
- **URL**: http://localhost:5601/app/kubernetesPoc
- **API Endpoint**: `GET /internal/kubernetes_poc/hello_world`

### Run Tests
```bash
# Unit tests
yarn test:jest x-pack/solutions/observability/plugins/kubernetes-poc --no-watchman
```

## API Endpoints

### Hello World
- **Endpoint**: `GET /internal/kubernetes_poc/hello_world`
- **Security**: Requires `kibana_read` privilege
- **Response**: 
  ```json
  {
    "message": "Hello World from kubernetes-poc plugin!",
    "timestamp": "2025-12-10T..."
  }
  ```

## Known Issues / Gotchas

1. **Security Configuration**: All routes must have `security.authz` configuration to avoid `Cannot read properties of undefined (reading 'authz')` errors
2. **Bundle Warnings**: Removed `kibanaReact` from `requiredBundles` since we're using `@kbn/react-kibana-context-render` directly
3. **Plugin Discovery**: Plugin must be bootstrapped (`yarn kbn bootstrap`) and Kibana restarted for changes to take effect

## Architecture Decisions

1. **Route Repository Pattern**: Chose `@kbn/server-route-repository` over traditional router for type safety and consistency with other Observability plugins
2. **No Navigation Registration**: Currently not registered with Observability navigation - can be added later if needed
3. **Minimal Dependencies**: Only required plugins are included to keep plugin lightweight

## Useful Commands

```bash
# Check for linting errors
yarn kbn run lint --scope @kbn/kubernetes-poc-plugin

# Type check
yarn kbn run type-check --scope @kbn/kubernetes-poc-plugin

# Build plugin
yarn kbn run build --focus @kbn/kubernetes-poc-plugin
```

## Notes

- Plugin follows the Observability plugin tier system (Tier 1: End User Plugin)
- Uses the same patterns as `observability_onboarding` plugin for consistency
- Route handler resources are defined in `server/routes/types.ts`
- Client-side API calls use the type-safe repository client pattern

