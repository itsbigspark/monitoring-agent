# Modern Java Development

Use this standard for Java services, libraries, and JVM-adjacent build files.

## Defaults

- Prefer the repo's declared Java version. For new services, target the current LTS used by the estate rather than whatever is newest.
- Use Google Java Style unless the repo declares a stricter local style.
- Use `google-java-format` or an equivalent configured formatter; do not hand-format disputed style.
- Use JUnit Jupiter for new tests.
- Prefer Gradle Wrapper or Maven Wrapper commands committed by the repo; do not assume a globally installed build tool.

## Code

- Keep classes small and cohesive. Extract domain behavior before extracting generic helpers.
- Use records for immutable data carriers when the repo's Java version supports them and behavior is minimal.
- Avoid wildcard imports, hidden global state, finalizers, and broad `catch (Exception)` blocks.
- Prefer constructor injection for required collaborators.
- Treat nullability as a contract. Use explicit validation at boundaries and avoid returning `null` from new APIs.
- Keep public API Javadoc focused on behavior, invariants, side effects, and failure modes.

## Testing

- Write tests at the boundary where behavior is visible.
- Use parameterized tests for equivalent cases and separate tests for materially different behavior.
- Keep integration tests deterministic; isolate network, clock, filesystem, and external service dependencies.
- Prefer `mvn verify` or the repo's Gradle verification task for full local confidence.

## Backend And Runtime Concerns

- Use structured logging through the repo logging facade; never use `System.out` for application logs.
- Propagate request/correlation IDs through service boundaries.
- Expose health/readiness endpoints for deployable services.
- Keep resource limits explicit for pools, clients, queues, and executors.

## Research Basis

- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [google-java-format](https://github.com/google/google-java-format)
- [JUnit 5 User Guide](https://docs.junit.org/5.13.1/user-guide/index.html)
- [Gradle User Manual](https://docs.gradle.org/)
- [Maven Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle)
