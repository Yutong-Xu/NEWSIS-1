-- CreateTable
CREATE TABLE "User" (
    "studentNo" TEXT NOT NULL PRIMARY KEY,
    "passwordHash" TEXT,
    "authSource" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "creditsCompleted" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labelZh" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "regOpenAt" DATETIME NOT NULL,
    "regCloseAt" DATETIME NOT NULL,
    "addDropCloseAt" DATETIME NOT NULL,
    "creditLimit" REAL NOT NULL DEFAULT 18
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termId" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "credits" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "instructorZh" TEXT NOT NULL,
    "instructorEn" TEXT NOT NULL,
    "rating" REAL,
    "reviews" INTEGER,
    "demand" TEXT,
    "workload" TEXT,
    "descriptionZh" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "grading" TEXT NOT NULL DEFAULT 'Graded',
    "minYear" INTEGER,
    "majorsAllowed" TEXT,
    "prereqCourseIds" TEXT,
    "excludedCourseIds" TEXT,
    "targetZh" TEXT,
    "targetEn" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'teal',
    CONSTRAINT "Course_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "classNbr" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "reservedQuota" INTEGER NOT NULL DEFAULT 0,
    "reservedForZh" TEXT,
    "reservedForEn" TEXT,
    "waitlistCapacity" INTEGER NOT NULL DEFAULT 0,
    "waitlistCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "room" TEXT NOT NULL,
    "dateStart" TEXT NOT NULL,
    "dateEnd" TEXT NOT NULL,
    CONSTRAINT "Meeting_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "tutorialSectionId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'primary',
    "backupOfItemId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanItem_tutorialSectionId_fkey" FOREIGN KEY ("tutorialSectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "planId" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Registration_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistrationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failReason" TEXT,
    "failDetailZh" TEXT,
    "failDetailEn" TEXT,
    "waitlistPosition" INTEGER,
    CONSTRAINT "RegistrationItem_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegistrationItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enrolled',
    "source" TEXT NOT NULL DEFAULT 'plan',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "droppedAt" DATETIME,
    CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompletedCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "credits" REAL NOT NULL,
    "grade" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    CONSTRAINT "CompletedCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DegreeRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "major" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requiredCredits" REAL NOT NULL,
    "labelZh" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "courseId" TEXT,
    "kind" TEXT NOT NULL,
    "bodyZh" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("studentNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_courseId_sectionCode_key" ON "Section"("courseId", "sectionCode");

-- CreateIndex
CREATE INDEX "Meeting_sectionId_idx" ON "Meeting"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_userId_name_key" ON "Plan"("userId", "name");

-- CreateIndex
CREATE INDEX "PlanItem_planId_idx" ON "PlanItem"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_courseId_key" ON "Candidate"("userId", "courseId");

-- CreateIndex
CREATE INDEX "RegistrationItem_registrationId_idx" ON "RegistrationItem"("registrationId");

-- CreateIndex
CREATE INDEX "Enrollment_userId_termId_status_idx" ON "Enrollment"("userId", "termId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_sectionId_termId_key" ON "Enrollment"("userId", "sectionId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedCourse_userId_courseCode_key" ON "CompletedCourse"("userId", "courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "DegreeRequirement_major_category_key" ON "DegreeRequirement"("major", "category");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
