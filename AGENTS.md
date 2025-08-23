# AI Agent Contribution Guide

## Project Overview

This project aims at a minimalistic front-end only website that is served via
Github pages as a static site. This site is simply a platform to create and
share cost splitting for groups of people with complicated transaction splits
and requirements. Due to the simplistic nature of this work, everything is done
in native HTML + JavaScript + CSS. Node is only a requirement for development
purposes (linting, formatting, testing).

## Code Best Practices

1. Prioritize separation of roles and consistent style
2. Do not change state structure unless absolutely necessary
3. Ensure functions are pure and side-effect free where possible
4. Avoid deep nesting of functions and conditionals, especially with ternary
   operators

## Documentation

1. Document all non-trivial functions with JSDoc format
2. Ensure any changes to key functionality is reflected in function descriptions
3. Features list in README.md should contain only features that the average user
   will care about
4. Ensure that any new features are reflected in the user guide

## PR Checklist

- [ ] Documentation has been updated
- [ ] Linting passed
- [ ] Formatting passed
- [ ] All tests passed
