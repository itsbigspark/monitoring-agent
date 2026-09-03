# API Backend Service

Use this standard for API handlers, service boundaries, contracts, and backend runtime behavior.

## Security Defaults

- Enforce authentication, authorization, and tenant/object access on the server.
- Validate request shape and business permissions before side effects.
- Avoid mass assignment. Map external DTOs into explicit internal commands.
- Put resource limits on request body size, pagination, fan-out, retries, concurrency, and expensive queries.
- Treat third-party and internal service responses as untrusted input.
- Keep an API inventory and deprecate versions deliberately.

## API Design

- Make success, validation failure, authorization failure, conflict, and dependency failure explicit.
- Keep error responses useful but non-sensitive.
- Use idempotency keys for retryable mutating operations where duplicate side effects matter.
- Use stable contracts and versioning for public or cross-team APIs.
- Document request/response examples for non-trivial behavior.

## Resilience

- Set timeouts on outbound calls.
- Use bounded retries only for safe operations and transient failures.
- Use circuit breakers or backpressure where dependency failures can cascade.
- Keep background work observable and retryable.

## Operations

- Expose health and readiness checks for deployable services.
- Emit structured logs, metrics, and traces for important flows.
- Preserve correlation IDs across inbound and outbound calls.
- Distinguish audit events from operational logs.

## Testing

- Cover authorization and object-level access controls.
- Test validation, error paths, resource limits, and idempotency where relevant.
- Use contract tests for external API behavior when consumers depend on it.

## Research Basis

- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP API Security Project](https://owasp.org/www-project-api-security/)
- [Spring Boot Production-ready Features](https://docs.spring.io/spring-boot/reference/actuator/index.html)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
