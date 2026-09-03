# React TypeScript Frontend

Use this standard for React, TypeScript, CSS, and frontend test changes.

## Defaults

- Use TypeScript for new React components where the repo supports it.
- Keep rendering logic and markup together in components; extract components around meaningful UI concepts.
- Prefer semantic HTML before ARIA. Use ARIA only when native elements cannot express the interaction.
- Treat WCAG 2.2 AA as the default target unless the repo declares another accessibility level.
- Use the repo's formatter, linter, type checker, test runner, and build command.

## React

- Build from data and component hierarchy first, then add interactivity.
- Keep state minimal. Do not store values that can be derived from props or existing state.
- Keep components pure; side effects belong in event handlers, effects, or data-layer code.
- Avoid prop drilling by extracting boundaries or using the repo's established state/data pattern.
- Keep loading, empty, error, disabled, and permission states explicit.

## TypeScript

- Type component props and domain data at boundaries.
- Prefer discriminated unions for state machines and async states.
- Use exhaustive handling for union variants.
- Avoid `any`; use `unknown` plus narrowing when data is untrusted.

## Accessibility And UX

- Ensure controls have accessible names.
- Preserve keyboard operation and visible focus.
- Do not use color alone to convey state.
- Use form labels, error text, and status regions where relevant.
- Verify responsive constraints so text and controls do not overlap.

## Testing

- Test user-visible behavior rather than implementation detail.
- Prefer queries that reflect how users find elements.
- Include accessibility and keyboard paths for interactive components.
- Run a production build for changes that affect bundling, routing, or environment config.

## Research Basis

- [React: Thinking in React](https://react.dev/learn/thinking-in-react)
- [React: Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React: Using TypeScript](https://react.dev/learn/typescript)
- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [W3C WCAG Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [MDN ARIA](https://developer.mozilla.org/docs/Web/Accessibility/ARIA)
- [Vite Production Build](https://vite.dev/guide/build)
