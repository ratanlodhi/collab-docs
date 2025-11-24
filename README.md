# Collaborative Document Editor Project

This project is a collaborative document editor consisting of two main parts: the **frontend** and the **backend**. It enables real-time editing and sharing of documents using modern web technologies.

## Project Structure

- **backend/**: Node.js/Express server with WebSocket (Socket.IO) support, database models, and API endpoints.
- **frontend/**: React + TypeScript app built with Vite, providing the user interface for document editing and sharing.

---

## Backend

The backend is built with Node.js and Express, leveraging the following key dependencies:

- Express for building the HTTP server
- Mongoose for MongoDB interactions
- Socket.IO for real-time communication
- dotenv for environment variable management
- cors to enable cross-origin requests
- supabase-js and nanoid as utility dependencies

### Starting the backend server

1. Navigate to the `backend` directory:

    ```bash
    cd backend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the server:

    ```bash
    npm start
    ```

The backend server entry point is `server.js` and typically runs on `http://localhost:PORT` (check your environment setup).

---

## Frontend

The frontend is a React app bootstrapped with Vite and written in TypeScript. 

Key dependencies include:

- React and React DOM
- React Router DOM for routing
- React Quill for rich text editing
- Socket.IO client for real-time communication

### Running the frontend

1. Navigate to the `frontend` directory:

    ```bash
    cd frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm run dev
    ```

This launches the frontend app with hot module replacement at `http://localhost:5173` (default Vite port).

---

## General Notes

- Make sure both backend and frontend servers are running to enable full functionality.
- Environment variables may need to be set for backend configuration (check `.env` files or backend documentation).
- This project uses TypeScript for type safety and Vite for fast development builds.

---

## Scripts Summary

### Backend

- `npm start`: Starts the backend server.

### Frontend

- `npm run dev`: Starts the frontend development server.
- `npm run build`: Builds the frontend for production.
- `npm run lint`: Runs ESLint on frontend source code.
- `npm run preview`: Previews the production build.

---

## License

This project is licensed under the [ISC License](./backend/package.json).
