# Puppeteer Alternative

A TypeScript-based project providing an alternative approach to browser automation using different runners like Puppeteer and Playwright. It is designed to execute automated browser tasks, take screenshots, and measure step execution times for debugging and performance analysis.

## Features

- Supports multiple browser automation runners (Puppeteer, Playwright)
- Easy runner selection and extensibility
- Step timing and logging for performance insights
- Screenshot capture and storage

## Directory Structure

- `src/` — Source code, including runner implementations and utilities
- `ids.csv` — List of IDs to be processed
- `screenshots/` — Output directory for captured screenshots
- `package.json` — Project dependencies and scripts

## Prerequisites

- Node.js (v16+ recommended)
- pnpm (or npm/yarn)

## Installation

```bash
pnpm install
```

## Usage
1. Copy the example environment file and fill in all required properties:
   ```bash
   cp .env.example .env
   # Edit .env and set all necessary values
   ```

2. Run the main automation script:
   ```bash
   pnpm start
   ```
   Or, if using npm:
   ```bash
   npm run start
   ```

Screenshots and logs will be output to the `screenshots/` directory.

## Customization
- Add or modify runners in `src/runners/` to support additional automation frameworks.
- Adjust timing and logging behavior in `src/step.timer.ts`.