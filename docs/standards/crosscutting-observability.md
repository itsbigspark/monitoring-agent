# Observability Standard

Use this standard for traces, metrics, logs, health checks, and operational diagnostics.

## Defaults

- Prefer OpenTelemetry-compatible instrumentation and semantic conventions.
- Preserve trace/correlation context across service boundaries.
- Emit metrics for critical request paths, dependency calls, queues, jobs, and resource pools.
- Expose health/readiness checks for deployable services.
- Keep dashboards and alerts tied to user impact or operational risk, not noisy implementation detail.

## Tracing

- Create spans around meaningful service boundaries and expensive dependency calls.
- Use semantic attributes where available.
- Avoid high-cardinality span attributes unless explicitly needed and safe.
- Record errors with enough context to diagnose without leaking sensitive data.

## Metrics

- Prefer counters, histograms, and gauges that answer operational questions.
- Use consistent units and names.
- Avoid user IDs, request IDs, and raw object IDs as metric labels.
- Track latency, traffic, errors, saturation, and queue/backlog where relevant.

## Health And Readiness

- Health should reflect process liveness.
- Readiness should reflect whether the service can safely receive traffic.
- Dependency checks should be bounded and should not make health endpoints a source of cascading failure.

## Research Basis

- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry General Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/general/)
- [Spring Boot Observability](https://docs.enterprise.spring.io/spring-boot/reference/actuator/observability.html)
- [Spring Boot Production-ready Features](https://docs.spring.io/spring-boot/reference/actuator/index.html)
