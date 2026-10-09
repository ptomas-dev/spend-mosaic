# Spend Mosaic - Personal Finance App

## Overview

The Personal Finance App is a web application designed to help you manage and track your expenses and income. It provides an intuitive interface to add, view, and analyze your financial transactions, along with features for generating reports and tracking balances.

## Technologies Used

- **Frontend**:
  - [React](https://reactjs.org/): A JavaScript library for building user interfaces.
  - [TypeScript](https://www.typescriptlang.org/): A typed superset of JavaScript.
  - [Redux Toolkit](https://redux-toolkit.js.org/): A library for managing global state.
  - [React Router](https://reactrouter.com/): For client-side routing.
  - [Vercel](https://vercel.com/): For deploying the frontend.

- **Backend**:
  - [Node.js](https://nodejs.org/): JavaScript runtime for building the server.
  - [Express](https://expressjs.com/): Web application framework for Node.js.
  - [TypeScript](https://www.typescriptlang.org/): For type safety in the backend.
  - [Prisma](https://www.prisma.io/): ORM for interacting with the database.
  - [PostgreSQL](https://www.postgresql.org/): Relational database for storing financial data.
  - [Heroku](https://www.heroku.com/): For deploying the backend.

- **Database Connection**

  This project now uses a [PostgreSQL](https://www.postgresql.org/) database to store expense records. The connection to PostgreSQL has been configured using Sequelize, an ORM (Object-Relational Mapper) for Node.js, to facilitate the interaction with the database.

  For now, the PostgreSQL database is run separately from the project, so make sure you have a PostgreSQL instance running and properly configured before starting the server.

  _Setup Instructions_:

  Install PostgreSQL and create a new database (you can name it according to your preference, e.g., finmosaic_dev).

  Ensure that you have set up environment variables in a .env file at the project’s root to manage database credentials and connection settings:

  ```
  DB_HOST=your_database_host
  DB_USER=your_database_user
  DB_PASSWORD=your_database_password
  DB_NAME=your_database_name
  DB_PORT=your_database_port
  ```

  Run the app with npm start (or node server.js). The server will attempt to connect to the PostgreSQL database when it starts.

  If you’re using pgAdmin4 or any other database client, you can inspect the tables and records created by Sequelize under the specified database.

## Features

- **Dashboard**:
  - Overview of total income, total expenses, and current balance.
  - Basic breakdown of financial data.

- **Expenses Management**:
  - Add and view expenses with a date, amount, category, and optional note.

- **Income Management**:
  - Add and view income with a date, amount, category, and optional note.

- **Reports** (Upcoming):
  - Generate simple reports showing income vs. expenses.
  - Visualize data with charts and graphs.

## Milestones

### Phase 1: Core Features (MVP)

- [x] Setup project repository and initial configuration.
- [x] Develop frontend layout with static header, footer, and sidebar.
- [x] Implement basic pages with React router: Dashboard, Expenses, Income.
- [ ] Set up Redux for state management.
- [x] Create API endpoints for listing and creating expenses and income.
- [x] Connect the expenses and income pages to the backend API.
- [ ] Deploy frontend and backend.

### Phase 2: Enhancements

- [x] Add basic form validation and error handling to expense and income creation.
- [ ] Add advanced filtering and sorting options.
- [ ] Develop dynamic reports and integrate charts.
- [ ] Add user authentication (JWT-based).

### Phase 3: Advanced Features

- [ ] Support for recurring transactions.
- [ ] Manage multiple financial accounts.
- [ ] Data export functionality (CSV/Excel).
- [ ] Integration with external bank services (optional).

## Project Structure

This project uses **npm workspaces** to manage a monorepo with two independent applications:

- `backend/`: Express.js server with Node.js
- `frontend/`: React + TypeScript web application

### Why Workspaces?

Workspaces simplify dependency management by:

- Installing all dependencies from the repository root with a single `npm install`
- Running scripts for individual apps without navigating between directories
- Keeping a single, centralized `package-lock.json` for consistency

## Getting Started

### Prerequisites

- Node.js and npm installed on your local machine.
- PostgreSQL database set up (locally or remotely).

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/spend-mosaic.git
   cd spend-mosaic
   ```

2. **Install all dependencies** (from repository root):

   ```bash
   npm install
   ```

   This command automatically installs dependencies for both `backend/` and `frontend/` workspaces.

3. **Set up environment variables**:
   - Create a `.env` file in the `/backend` directory with database credentials:
     ```
     DB_HOST=your_database_host
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     DB_NAME=your_database_name
     DB_PORT=your_database_port
     ```
   - Create a `.env` file in the `/frontend` directory with any API configuration if needed.

4. **Run the development server**:
   - For frontend only:
     ```bash
     npm run dev:frontend
     ```
   - For backend only:
     ```bash
     npm run dev:backend
     ```
   - For both (in separate terminals):

     ```bash
     # Terminal 1
     npm run dev:backend

     # Terminal 2
     npm run dev:frontend
     ```

5. **Access the app**:
   - Open your browser and navigate to `http://localhost:5173` for the frontend.
   - Ensure the backend is running at `http://localhost:5000` or your configured port.

## Deployment

- **Frontend**: Deployed on [Vercel](https://vercel.com/).
- **Backend**: Deployed on [Heroku](https://www.heroku.com/).

## Development Workflow

See [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) for the Git workflow used to maintain this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, you can reach me at [1pedrotomas1@gmail.com](mailto:1pedrotomas1@gmail.com).
