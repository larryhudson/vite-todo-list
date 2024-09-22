# To-Do List with React + Vite

This is a simple to-do list project built with React and Vite. It serves as a demo project to experiment with a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) that uses [Aider](https://aider.chat/) to automatically create and review pull requests.

## Project Overview

This project demonstrates a basic to-do list application with the following features:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Filter tasks by status (all, active, completed)

## Technology Stack

- **React**: A JavaScript library for building user interfaces
- **Vite**: A build tool that aims to provide a faster and leaner development experience for modern web projects
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript

## Project Structure

The project follows a standard React + Vite structure:

```
/
├── src/
│   ├── components/
│   │   └── (React components)
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── (static assets)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Running the Project

To run this project locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open your browser and navigate to `http://localhost:5173`

## GitHub App Integration

This project is integrated with a custom GitHub App that uses Aider to automate pull request creation and review. This integration demonstrates how AI can be leveraged in the development workflow to streamline code reviews and contributions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
