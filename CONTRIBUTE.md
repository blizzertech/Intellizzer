# Contributing to Intellizzer

## Welcome Contributors!

We appreciate your interest in contributing to Intellizzer. This document provides guidelines to help you contribute effectively to the project.

## Getting Started

### Prerequisites
- Node.js (version 20 or later)
- Yarn package manager

### Setup
1. Fork the repository
2. Clone your forked repository
3. Install dependencies:
   ```bash
   yarn install
   ```

## Development Workflow

### Before Starting Development
- **Create an Issue First**: 
  - Before working on a new feature or bug fix, create an issue in the GitHub repository
  - Describe the proposed change, its motivation, and potential implementation approach
  - Wait for maintainer feedback and approval before beginning work
  - This helps prevent duplicate work and ensures alignment with project goals

### Branch Strategy
- Create a new branch for each feature or bugfix
- Use descriptive branch names:
  - `feature/add-new-feature`
  - `bugfix/resolve-specific-issue`
  - `docs/update-contribution-guidelines`
- **Pull Requests should target the `dev` branch**

### Code Style
- Follow TypeScript best practices
- Use ESLint for code linting
- Ensure all tests pass before submitting a pull request
- **Run `yarn format` before creating a pull request to ensure consistent code formatting**

### Commit Messages
- Use clear and descriptive commit messages
- Follow the conventional commits format:
  ```
  <type>(optional scope): <description>
  
  Examples:
  feat: add new code review feature
  fix: resolve GitHub API connection issue
  docs: update contribution guidelines
  ```

## Submitting Contributions

### Pull Request Process
1. Create an issue describing your proposed change
2. Get approval from project maintainers
3. Ensure your code follows the project's coding standards
4. Run `yarn format` to standardize code formatting
5. Update documentation if necessary
6. Add tests for new features or bug fixes
7. Submit a pull request targeting the `dev` branch with:
   - A clear description of changes
   - Reference to the original issue
   - Any additional context that helps reviewers understand the contribution

### Code Review
- All submissions require review from project maintainers
- Be open to feedback and constructive criticism
- Respond to review comments promptly

## Reporting Issues
- Use GitHub Issues to report bugs or suggest features
- Provide detailed information:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment details (OS, Node.js version, etc.)

## Code of Conduct
- Be respectful and inclusive
- Harassment and discrimination are not tolerated

## Questions?
If you have any questions, please open an issue or reach out to the maintainers.

Thank you for contributing to Intellizzer! 🚀