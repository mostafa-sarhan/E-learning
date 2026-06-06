# Student Management Backend

Simple Express + TypeScript backend for student management.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts on `http://localhost:5000`.

For production build:

```bash
npm run build
npm start
```

## Mongo Compass

Use this connection string in Compass:

`mongodb://localhost:27017/students`

## API Endpoints

- `GET /api/health`
- `GET /api/students`
- `GET /api/students/:id`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`
- `GET /api/enrollments`
- `POST /api/enrollments`
- `DELETE /api/enrollments/:studentId/:courseId`
