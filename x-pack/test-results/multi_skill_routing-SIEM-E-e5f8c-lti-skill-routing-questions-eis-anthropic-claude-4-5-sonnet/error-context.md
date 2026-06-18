# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: multi_skill_routing.spec.ts >> SIEM Entity Analytics - Multi-Skill Routing >> entity analytics multi-skill routing questions
- Location: x-pack/solutions/security/packages/kbn-evals-suite-entity-analytics/evals/v1/multi_skill_routing.spec.ts:24:26

# Error details

```
KbnClientRequesterError: [GET - http://localhost:5621/api/actions/connector/eis-anthropic-claude-4-5-sonnet] request failed (attempt=1/0): undefined -- Status: N/A, Cause: fetch failed -- and ran out of retries
```

# Test source

```ts
  176 |     const url = this.resolveUrlInternal(this.urlForFetch, options.path);
  177 |     const queryString = options.query ? `?${Qs.stringify(options.query)}` : '';
  178 |     const fullUrl = url + queryString;
  179 |     let attempt = 0;
  180 |     const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;
  181 |     const msgOrThrow = errMsg({
  182 |       redacted: url,
  183 |       maxAttempts,
  184 |       requestedRetries: options.retries !== undefined,
  185 |       // Network-level errors (DNS, connection refused, etc.) surface as TypeError from fetch.
  186 |       failedToGetResponseSvc: (error: Error) => error instanceof TypeError,
  187 |       ...options,
  188 |     });
  189 | 
  190 |     while (true) {
  191 |       attempt += 1;
  192 |       try {
  193 |         this.log.debug(`Requesting url (redacted): [${url}]`);
  194 | 
  195 |         // Unlike high-level HTTP clients such as axios, the native fetch doesn't pick a
  196 |         // serialization strategy automatically, and we should do this manually: plain objects
  197 |         // will become JSON, `form-data` streams will go through as multipart with the right
  198 |         // boundary, strings will stay as is.
  199 |         const isJsonBody = isJsonShapedBody(options.body);
  200 |         const hasExplicitContentType =
  201 |           options.headers !== undefined &&
  202 |           Object.keys(options.headers).some((k) => k.toLowerCase() === 'content-type');
  203 | 
  204 |         const headers = {
  205 |           ...(this.authorization ? { Authorization: this.authorization } : {}),
  206 |           ...options.headers,
  207 |           'kbn-xsrf': 'kbn-client',
  208 |           'x-elastic-internal-origin': 'kbn-client',
  209 |           ...(isJsonBody && !hasExplicitContentType ? { 'content-type': 'application/json' } : {}),
  210 |         };
  211 | 
  212 |         const body =
  213 |           options.body === undefined
  214 |             ? undefined
  215 |             : isJsonBody
  216 |             ? JSON.stringify(options.body)
  217 |             : (options.body as BodyInit);
  218 | 
  219 |         const response = await fetch(fullUrl, {
  220 |           method: options.method,
  221 |           headers,
  222 |           body,
  223 |           signal: options.signal,
  224 |           ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
  225 |         } as RequestInit);
  226 | 
  227 |         if (!response.ok) {
  228 |           if (options.ignoreErrors?.includes(response.status)) {
  229 |             // Caller asked us to silently swallow this status (e.g. 404 on delete). Preserve the
  230 |             // current contract so callers that destructure `.data` keep working.
  231 |             return {
  232 |               data: await readBody<T>(response, options.responseType),
  233 |               status: response.status,
  234 |               statusText: response.statusText,
  235 |               headers: response.headers,
  236 |             };
  237 |           }
  238 | 
  239 |           throw new KbnClientRequesterError(
  240 |             `[${options.method} ${url}] ${response.status} ${
  241 |               response.statusText
  242 |             } -- ${await response.text()}`,
  243 |             { status: response.status, headers: response.headers }
  244 |           );
  245 |         }
  246 | 
  247 |         return {
  248 |           data: await readBody<T>(response, options.responseType),
  249 |           status: response.status,
  250 |           statusText: response.statusText,
  251 |           headers: response.headers,
  252 |         };
  253 |       } catch (error) {
  254 |         const errorStatus =
  255 |           error instanceof KbnClientRequesterError && error.status !== undefined
  256 |             ? error.status
  257 |             : 'N/A';
  258 |         const errorCause =
  259 |           (error as { code?: string }).code || (error as Error).message || 'Unknown error';
  260 |         const errorDetails = `Status: ${errorStatus}, Cause: ${errorCause}`;
  261 | 
  262 |         this.log.debug(`Request failed - ${errorDetails}, Attempt: ${attempt}/${maxAttempts}`);
  263 | 
  264 |         if (attempt < maxAttempts) {
  265 |           await delay(1000 * attempt);
  266 |           continue;
  267 |         }
  268 | 
  269 |         throw new KbnClientRequesterError(
  270 |           `${msgOrThrow(attempt, error)} -- ${errorDetails} -- and ran out of retries`,
  271 |           {
  272 |             status: error instanceof KbnClientRequesterError ? error.status : undefined,
  273 |             headers: error instanceof KbnClientRequesterError ? error.headers : undefined,
  274 |             cause: error,
  275 |           }
> 276 |         );
      |          ^ KbnClientRequesterError: [GET - http://localhost:5621/api/actions/connector/eis-anthropic-claude-4-5-sonnet] request failed (attempt=1/0): undefined -- Status: N/A, Cause: fetch failed -- and ran out of retries
  277 |       }
  278 |     }
  279 |   }
  280 | }
  281 | 
  282 | async function readBody<T>(response: Response, responseType: ResponseType | undefined): Promise<T> {
  283 |   switch (responseType) {
  284 |     case 'text':
  285 |       return (await response.text()) as unknown as T;
  286 |     case 'arraybuffer':
  287 |       return (await response.arrayBuffer()) as unknown as T;
  288 |     case 'blob':
  289 |       return (await response.blob()) as unknown as T;
  290 |     case 'stream':
  291 |       return response.body as unknown as T;
  292 |     default:
  293 |       // Default 'json' (and undefined), matches axios's auto-JSON-parse, but tolerate empty bodies
  294 |       // as some endpoints return 200 with no content.
  295 |       const text = await response.text();
  296 |       try {
  297 |         return JSON.parse(text) as T;
  298 |       } catch {
  299 |         return text as unknown as T;
  300 |       }
  301 |   }
  302 | }
  303 | 
  304 | export function errMsg({
  305 |   redacted,
  306 |   requestedRetries,
  307 |   maxAttempts,
  308 |   failedToGetResponseSvc,
  309 |   path,
  310 |   method,
  311 |   description,
  312 | }: ReqOptions & {
  313 |   redacted: string;
  314 |   maxAttempts: number;
  315 |   requestedRetries: boolean;
  316 |   failedToGetResponseSvc: (x: Error) => boolean;
  317 | }) {
  318 |   return function errMsgOrReThrow(attempt: number, _: any) {
  319 |     const result = isConflictOnGetError(_, method)
  320 |       ? `Conflict on GET (path=${path}, attempt=${attempt}/${maxAttempts})`
  321 |       : requestedRetries || failedToGetResponseSvc(_)
  322 |       ? `[${
  323 |           description || `${method} - ${redacted}`
  324 |         }] request failed (attempt=${attempt}/${maxAttempts}): ${_?.code}`
  325 |       : '';
  326 |     if (result === '') throw _;
  327 |     return result;
  328 |   };
  329 | }
  330 | 
  331 | export function redactUrl(_: string): string {
  332 |   const url = new URL(_);
  333 |   return url.password ? `${url.protocol}//${url.host}${url.pathname}` : _;
  334 | }
  335 | 
```