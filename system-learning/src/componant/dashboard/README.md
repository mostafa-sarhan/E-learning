# Premium Student Dashboard Components

## Component Tree

```
StudentDashboard (main)
├── StudentHeaderCard (welcome banner with progress)
├── StudentContinueWatchingCard (last accessed lesson)
├── StudentLessonPreview (video preview card)
└── StudentTabs
    ├── Lessons Tab
    │   └── StudentUnitCard (unit grid)
    │       └── StudentLessonItem (individual lesson)
    ├── Exams Tab
    │   └── Exam cards with start button
    └── Results Tab
        └── Result cards with stats
```

## Components Overview

### StudentDashboard
Main dashboard container that manages state and data fetching.

### StudentHeaderCard
- Welcome message with greeting based on time of day
- Motivational text (randomized)
- Progress bar (animated) showing completed/total lessons

### StudentContinueWatchingCard
- Shows last accessed lesson with thumbnail
- Displays lesson title, unit name, and last watched time
- "Continue Watching" button resumes from lastTime

### StudentUnitCard
- Card-based layout (NOT accordion)
- Shows unit title, lesson count, total duration, progress %
- Contains StudentLessonItems

### StudentLessonItem
- Lesson title, duration, status icon
- Status: completed ✔️, in_progress ▶️, not_started ⏳
- Highlights current lesson with "📍 You are here" badge

### StudentLessonPreview
- Large video thumbnail with dark overlay
- Centered play button
- Duration badge
- Title overlay

### StudentTabs
- Tabbed interface (Lessons, Exams, Results)
- Lessons: Grid of StudentUnitCards
- Exams: List with start buttons
- Results: Stats + result cards

## Progress Tracking Hook

`useProgressTracker()` provides:
- `progressMap` - Stores progress for all lessons
- `updateProgress(lessonId, data)` - Updates progress
- `getProgress(lessonId)` - Gets progress for a lesson
- `getLastAccessedLesson(lessons)` - Returns most recently accessed lesson

Progress structure:
```javascript
{
  progressPercent: 0-100,
  lastTime: seconds,
  completed: boolean,
  updatedAt: timestamp
}
```

## Features

- ✅ Modern card-based UI (no tables/accordions)
- ✅ Animated progress bars
- ✅ Hover effects (scale + shadow)
- ✅ Responsive grid layout
- ✅ Mobile-first design
- ✅ Smooth transitions
- ✅ Premium gradients and shadows
- ✅ Tabbed interface for Lessons/Exams/Results

## Styling

- Tailwind CSS for all styling
- Rounded cards (xl/2xl)
- Soft shadows and hover effects
- Gradient backgrounds
- Backdrop blur effects
- RTL support (Arabic)

## Usage

```jsx
import StudentDashboard from "./componant/dashboard";

<StudentDashboard 
  student={studentData} 
  onLogout={handleLogout} 
/>
```
